const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");
const app = express();
const port = 3000;

// Utiliser CORS
app.use(cors());

app.use(express.static("public"));
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { category, codePostal } = req.body;

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/122.0"
  );

  try {
    await page.goto(
      `https://www.pagesjaunes.fr/annuaire/chercherlespros?quoiqui=${category}&ou=${codePostal}`
    );
    // const declineCookies = await page.waitForSelector(
    //   ".didomi-continue-without-agreeing"
    // );
    // await declineCookies.click();
    // await declineCookies.dispose();
    const numberOfPages = await page.evaluate(() => {
      const numberOfPages = document
        .querySelector("#SEL-compteur.pagination-compteur")
        .innerText.split(" ")[3];
      return numberOfPages;
    });
    let resultsArray = [];
    for (var i = 1; i <= numberOfPages; i++) {
      const results = await page.evaluate(() => {
        let pageResults = [];
        const results = document.querySelectorAll("li.bi.bi-generic");
        console.log(results);
        results.forEach((result) => {
          const resultData = result.querySelector(".bi-content");
          const name = resultData.querySelector("h3").innerText;
          const address = resultData
            .querySelector("[title='Voir le plan']")
            .innerText.replace(" Voir le plan", "");
          // const description = resultData.querySelector(".bi-description")
          //   ? resultData.querySelector(".bi-description").innerText
          //   : "Pas de description";
          if (!pageResults.includes([name, address])) {
            pageResults.push([name, address]);
          }
        });
        return pageResults;
      });
      results.forEach((result) => {
        const check = JSON.stringify(resultsArray).indexOf(
          JSON.stringify(result)
        );
        if (check === -1) {
          resultsArray.push(result);
        }
      });
      if (i < numberOfPages) {
        await page.goto(
          `https://www.pagesjaunes.fr/annuaire/chercherlespros?quoiqui=${category}&ou=${codePostal}&page=${
            i + 1
          }`
        );
      }
    }
    console.log(resultsArray, resultsArray.length);
    res.status(200).json(resultsArray);
  } catch (error) {
    console.error("Erreur lors du scraping:", error);
    res.status(500).send("Erreur lors du scraping");
  } finally {
    // await browser.close();
  }
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
