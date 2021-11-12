const { chromium } = require("playwright");

// const detalles = await page
//   .locator(
//     ':below(:text("Detalles"),100):above(:text("Información del vendedor"),200)'
//   )
//   .evaluateAll((detalles) => detalles.map((d) => d.textContent));
// console.log("🚀 ~ file: index.js ~ line 35 ~ main ~ detalles", detalles[0]);
// const precio = await page.locator(':text("$ ")').first().textContent();
// const formattedPrice = precio.split("$").pop().split("· Disponibles")[0];
// console.log(
//   "🚀 ~ file: index.js ~ line 48 ~ main ~ formattedPrice",
//   formattedPrice
// );
// console.log("🚀 ~ file: index.js ~ line 46 ~ main ~ precio", precio);

// const titulo = await page
//   .locator(`[dir="auto"]`)
//   .first()
//   .textContent({ timeout: 3000 });
// console.log("🚀 ~ file: index.js ~ line 58 ~ main ~ titulo", titulo);

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

const main = async () => {
  const browser = await chromium.launch({
    // headless: false,
  });
  const page = await browser.newPage();
  await page.goto(
    "https://www.facebook.com/marketplace/category/search?daysSinceListed=1&query=portatil%20i5%2016gb%2015&exact=false"
  );

  await page.waitForTimeout(3000);
  const items = await extractItems(page, 100);
  console.log("🚀 ~ file: index.js ~ line 57 ~ main ~ items", items);

  for (const item of items) {
    await page.goto(`https://www.facebook.com/marketplace/item/${item}`);
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
    const formattedPrice = precio.split("$").pop().split("· Disponibles")[0];
    console.log(
      "🚀 ~ file: index.js ~ line 48 ~ main ~ formattedPrice",
      formattedPrice
    );
    console.log("🚀 ~ file: index.js ~ line 46 ~ main ~ precio", precio);
  }
  await page.screenshot({ path: "screenshot.png" });
  await browser.close();
};

main();
