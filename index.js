const { chromium } = require("playwright");
const { performance } = require("perf_hooks");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const xl = require("excel4node");
const wb = new xl.Workbook();
const ws = wb.addWorksheet("Laptops");

if (!fs.existsSync("./db/database.sqlite")) {
  fs.writeFile("./db/database.sqlite", "Learn Node FS module", function (err) {
    if (err) throw err;
    console.log("File is created successfully.");
  });
}

async function extractItems(page, itemTargetCount, scrollDelay = 1000) {
  const locator = 'a:has-text("Bucaramanga")';
  let items = await page.locator(locator).elementHandles();
  var itemIds = [];

  while (items.length < itemTargetCount) {
    items = await page.locator(locator).elementHandles();
    previousHeight = await page.evaluate("document.body.scrollHeight");
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await page.waitForFunction(
      `document.body.scrollHeight > ${previousHeight}`
    );
    await page.waitForTimeout(scrollDelay);
  }

  for (const item of items) {
    const href = await item.evaluate((item) => item.getAttribute("href"));
    console.log("🚀 ~ href", href);
    var itemId = href.split("/item/").pop().split("/?ref")[0];
    itemIds.push(itemId);
  }

  return itemIds;
}

const initDB = () => {
  fs.unlinkSync("./db/database.sqlite");
  let db = new sqlite3.Database("./db/database.sqlite");
  db.run(
    "CREATE TABLE items(id TEXT, title TEXT, price TEXT, details TEXT, location TEXT, url TEXT, publicated TEXT)"
  );

  return db;
};

const removeDrawer = async (page) => {
  const drawer = await page
    .locator('[role="navigation"]')
    .first()
    .elementHandle();
  drawer.evaluate((drawer) => drawer.parentNode.removeChild(drawer));
};

const main = async () => {
  const t0 = performance.now();
  console.log("🚀  ~ t0", t0);
  const query = "portatil%20i7%2016gb";
  const daysSinceListed = 31;
  const maxPrice = 1500000;

  const headingColumnNames = [
    "id",
    "title",
    "price",
    "details",
    "location",
    "url",
    "publicated",
  ];
  const db = initDB();
  const browser = await chromium.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto(
    `https://www.facebook.com/marketplace/bucaramanga/search?maxPrice=${maxPrice}&daysSinceListed=${daysSinceListed}&query=${query}&exact=false`
  );
  await page.waitForTimeout(3000);
  await removeDrawer(page);
  const items = await extractItems(page, 100);
  console.log("🚀 ~ items length", items.length);
  const full = [];

  // Write Column Title in Excel file
  let headingColumnIndex = 1;
  headingColumnNames.forEach((heading) => {
    ws.cell(1, headingColumnIndex++).string(heading);
  });
  let rowIndex = 2;
  // ./Write Column Title in Excel file

  for (const item of items) {
    console.log(`//------------- ${item} --------------//`);
    const url = `https://www.facebook.com/marketplace/item/${item}`;
    await Promise.all([page.waitForNavigation(), page.goto(url)]);
    await removeDrawer(page);

    const detalles = await page
      .locator(
        ':below(:text("Detalles"),100):above(:text("La ubicación es aproximada"),200)'
      )
      .evaluateAll((detalles) => detalles.map((d) => d.textContent));
    console.log("🚀 ~ detalles", detalles[0]);

    const precio = await page.locator(':text("$ ")').first().textContent();
    const formattedPrice = precio
      .split("$")
      .pop()
      .split("· Disponibles")[0]
      .replace(".", "");
    console.log("🚀  ~ formattedPrice", formattedPrice);
    console.log("🚀  ~ precio", precio);

    const titulo = await page
      .locator(':above(:text("$ "),10)')
      .first()
      .textContent();
    console.log("🚀  ~ titulo", titulo);
    const ubicacion = await page
      .locator(':above(:text("La ubicación es aproximada"),5)')
      .first()
      .textContent();
    console.log("🚀  ~ ubicacion", ubicacion);
    const publicado = await page
      .locator(':text("Publicado")')
      .first()
      .textContent();
    console.log("🚀  ~ publicado", publicado);

    const data = {
      id: item,
      titulo: titulo,
      precio: formattedPrice,
      detalles: detalles[0],
      ubicacion: ubicacion,
      url: url,
      publicado: publicado,
    };
    full.push(data);
    // Write row data in Excel file
    let columnIndex = 1;
    Object.keys(data).forEach((columnName) => {
      ws.cell(rowIndex, columnIndex++).string(data[columnName]);
    });
    rowIndex++;
    wb.write("./items.xlsx");
    // insert one row into the langs table
    db.run(
      `INSERT INTO items(id, title, price, details, location, url, publicated) VALUES (?,?,?,?,?,?,?)`,
      [item, titulo, formattedPrice, detalles[0], ubicacion, url, publicado],
      function (err) {
        if (err) {
          return console.log(err.message);
        }
        // get the last insert id
        console.log(`A row has been inserted with rowid ${this.lastID}`);
      }
    );
    await page.screenshot({ path: "screenshot.png" });
  }
  db.close();
  await browser.close();
  const t1 = performance.now();
  console.log(`Call to doSomething took ${t1 - t0} milliseconds.`);
};

main();
