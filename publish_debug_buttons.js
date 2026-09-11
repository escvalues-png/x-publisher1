import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function main() {
    log("=== INICIANDO DETECTOR DE BOTÓN REAL ===");

    const browser = await puppeteer.connect({
        browserWSEndpoint: process.env.BROWSERLESS_URL
    });

    const page = await browser.newPage();

    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    log("Abriendo composer...");
    await page.goto("https://x.com/compose/post", { waitUntil: "networkidle2" });

    log("Escribiendo texto de prueba...");
    await page.waitForSelector('div[role="textbox"]');
    await page.type('div[role="textbox"]', "TEST BUTTON DETECTOR");

    log("Buscando TODOS los botones...");
    const buttons = await page.$$('button, div[role="button"]');

    log(`Botones encontrados: ${buttons.length}`);

    let index = 0;

    for (const btn of buttons) {
        index++;

        const html = await page.evaluate(el => el.outerHTML, btn);
        const text = await page.evaluate(el => el.innerText, btn);
        const aria = await page.evaluate(el => el.getAttribute("aria-label"), btn);
        const testid = await page.evaluate(el => el.getAttribute("data-testid"), btn);

        log(`--- BOTÓN ${index} ---`);
        log(`HTML: ${html}`);
        log(`Texto: ${text}`);
        log(`aria-label: ${aria}`);
        log(`data-testid: ${testid}`);

        log(`Probando click en botón ${index}...`);

        try {
            await Promise.all([
                btn.click(),
                page.waitForNavigation({ waitUntil: "networkidle2", timeout: 5000 })
            ]);

            log(`✔ BOTÓN ${index} DISPARÓ NAVEGACIÓN — ESTE ES EL BOTÓN REAL`);
            await browser.close();
            return;

        } catch (err) {
            log(`❌ BOTÓN ${index} NO disparó navegación`);
        }
    }

    log("❌ Ningún botón disparó navegación. El botón real está en shadow DOM.");
    log("Necesitamos escanear shadow roots.");

    await browser.close();
}

main();
