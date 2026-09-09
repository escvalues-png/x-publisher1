import puppeteer from "puppeteer-core";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

function log(msg) {
    const time = new Date().toISOString();
    console.log(`[${time}] ${msg}`);
}

async function main() {
    log("Iniciando comprobador de encuestas…");

    const browser = await puppeteer.connect({
        browserWSEndpoint: process.env.BROWSERLESS_URL
    });

    const page = await browser.newPage();

    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    log("Abriendo X…");
    await page.goto("https://x.com/home", { waitUntil: "networkidle2" });

    // Captura de pantalla del home
    await page.screenshot({ path: "/tmp/home.png" });
    log("Captura guardada: /tmp/home.png");

    // Comprobar si hay sesión
    const loggedIn = await page.$('a[href="/compose/tweet"]');

    if (!loggedIn) {
        log("❌ No parece haber sesión iniciada en X.");
        log("Esto explica por qué NO aparece el botón de encuesta.");
        await browser.close();
        return;
    }

    log("✔ Sesión detectada.");

    // Ir al composer
    log("Abriendo composer…");
    await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" });

    await page.screenshot({ path: "/tmp/composer.png" });
    log("Captura guardada: /tmp/composer.png");

    // Comprobar si el composer es completo
    const fullComposer = await page.$('div[data-testid="toolBar"]');

    if (!fullComposer) {
        log("❌ Composer reducido detectado.");
        log("Esto significa que X NO está mostrando encuestas.");
        log("Causas posibles:");
        log("- Perfil de Browserless sin cookies");
        log("- Sesión corrupta");
        log("- Cuenta sin encuestas activadas");
        await browser.close();
        return;
    }

    log("✔ Composer completo detectado.");

    // Buscar botón de encuesta
    const pollButton1 = await page.$('div[data-testid="addPoll"]');
    const pollButton2 = await page.$('button[data-testid="addPoll"]');

    if (pollButton1 || pollButton2) {
        log("✔ Botón de encuesta encontrado.");
        log("Tu cuenta soporta encuestas y el perfil está cargado correctamente.");
    } else {
        log("❌ NO se encontró el botón de encuesta.");
        log("Esto significa:");
        log("- Tu cuenta NO tiene encuestas activadas, O");
        log("- El perfil cargado NO es el correcto, O");
        log("- Browserless está cargando un composer limitado.");
    }

    await browser.close();
    log("Comprobador finalizado.");
}

main();
