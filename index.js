const { chromium } = require("playwright");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

// if (!fs.existsSync("./db/database.sqlite")) {
//   fs.writeFile("./db/database.sqlite", "Learn Node FS module", function (err) {
//     if (err) throw err;
//     console.log("File is created successfully.");
//   });
// }

async function extractItems(page, itemTargetCount, scrollDelay = 1000) {
  let items = await page.locator('img:near(:text("$"))').elementHandles();
  console.log("🚀 ~ file: index.js ~ line 15 ~ main ~ items", items.length);
  var itemIds = [];

  while (items.length < itemTargetCount) {
    items = await page.locator('img:near(:text("$"))').elementHandles();
    previousHeight = await page.evaluate("document.body.scrollHeight");
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await page.waitForFunction(
      `document.body.scrollHeight > ${previousHeight}`
    );
    await page.waitForTimeout(scrollDelay);
  }

  for (const item of items) {
    await item.click();
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log(
      "🚀 ~ file: index.js ~ line 29 ~ main ~ currentUrl",
      currentUrl
    );
    var itemId = currentUrl.split("/item/").pop().split("/?ref")[0];
    itemIds.push(itemId);

    await page.keyboard.press("Escape");
  }
  console.log("🚀 ~ file: index.js ~ line 26 ~ main ~ itemIds", itemIds.length);
  return itemIds;
}

const initDB = () => {
  fs.unlinkSync("./db/database.sqlite");
  let db = new sqlite3.Database("./db/database.sqlite");
  db.run(
    "CREATE TABLE items(id TEXT, title TEXT, price TEXT, details TEXT, location TEXT, url TEXT)"
  );

  return db;
};

const query = "portatil%20i5%2016gb%2015";
const daysSinceListed = 1;

const main = async () => {
  const db = initDB();
  const browser = await chromium.launch({
    // headless: false,
  });
  const page = await browser.newPage();
  await page.goto(
    `https://www.facebook.com/marketplace/category/search?daysSinceListed=${daysSinceListed}&query=${query}&exact=false`
  );

  await page.waitForTimeout(3000);
  const items = await extractItems(page, 100);
  console.log("🚀 ~ file: index.js ~ line 57 ~ main ~ items", items);

  for (const item of items) {
    const url = `https://www.facebook.com/marketplace/item/${item}`;
    await page.goto(url);
    await page.waitForTimeout(3000);
    // Remove drawer
    const drawer = await page.locator('[role="navigation"]').elementHandle();
    drawer.evaluate((drawer) => drawer.parentNode.removeChild(drawer));

    const detalles = await page
      .locator(
        ':below(:text("Detalles"),100):above(:text("La ubicación es aproximada"),200)'
      )
      .evaluateAll((detalles) => detalles.map((d) => d.textContent));
    console.log("🚀 ~ file: index.js ~ line 35 ~ main ~ detalles", detalles[0]);

    const precio = await page.locator(':text("$ ")').first().textContent();
    const formattedPrice = precio
      .split("$")
      .pop()
      .split("· Disponibles")[0]
      .replace(".", "");
    console.log(
      "🚀 ~ file: index.js ~ line 48 ~ main ~ formattedPrice",
      formattedPrice
    );
    console.log("🚀 ~ file: index.js ~ line 46 ~ main ~ precio", precio);

    const titulo = await page
      .locator(':above(:text("$ "),10)')
      .first()
      .textContent();
    console.log("🚀 ~ file: index.js ~ line 58 ~ main ~ titulo", titulo);
    const ubicacion = await page
      .locator(':above(:text("La ubicación es aproximada"),5)')
      .first()
      .textContent();
    console.log("🚀 ~ file: index.js ~ line 105 ~ main ~ ubicacion", ubicacion);
    // insert one row into the langs table
    db.run(
      `INSERT INTO items(id, title, price, details, location, url) VALUES (?,?,?,?,?,?)`,
      [item, titulo, formattedPrice, detalles[0], ubicacion, url],
      function (err) {
        if (err) {
          return console.log(err.message);
        }
        // get the last insert id
        console.log(`A row has been inserted with rowid ${this.lastID}`);
      }
    );
  }
  db.close();
  await page.screenshot({ path: "screenshot.png" });
  await browser.close();
};

main();
