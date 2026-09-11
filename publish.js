import fetch from "node-fetch";
import dotenv from "dotenv";
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

dotenv.config();

// ===============================
// LOGGER
// ===============================
function log(msg) {
    const time = new Date().toISOString();
    console.log(`[${time}] ${msg}`);
}

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ===============================
// GET PENDING POSTS
// ===============================
async function getPendingPosts() {
    const url = `${process.env.API_URL}/get_pending_posts.php?token=${process.env.API_TOKEN}`;
    log(`Solicitando posts pendientes a: ${url}`);

    try {
        const res = await fetch(url);
        const data = await res.json();
        log(`Posts pendientes recibidos: ${JSON.stringify(data)}`);
        return data;
    } catch (err) {
        log("ERROR AL OBTENER POSTS:");
        log(err.message);
        return [];
    }
}

// ===============================
// MARCAR COMO PUBLICADO
// ===============================
async function markAsPublished(id) {
    const url = `${process.env.API_URL}/mark_as_published.php`;
    log(`Marcando como publicado ID=${id} en ${url}`);

    try {
        const payload = {
            id: id,
            token: process.env.API_TOKEN
        };

        log(`Payload enviado: ${JSON.stringify(payload)}`);

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        log(`Respuesta del servidor: ${text}`);

    } catch (err) {
        log("ERROR AL MARCAR COMO PUBLICADO:");
        log(err.message);
    }
}

// ===============================
// DESCARGAR IMAGEN
// ===============================
async function downloadImage(url) {
    log(`Descargando imagen desde: ${url}`);
    const filePath = path.join("/tmp", "image_to_upload.jpg");

    try {
        const response = await fetch(url);
        log(`Estado HTTP imagen: ${response.status}`);

        if (!response.ok) throw new Error("No se pudo descargar la imagen.");

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        log(`Imagen guardada en: ${filePath}`);
        return filePath;

    } catch (err) {
        log("ERROR AL DESCARGAR IMAGEN:");
        log(err.message);
        throw err;
    }
}

// ===============================
// DESCARGAR VIDEO
// ===============================
async function downloadVideo(url) {
    log(`Descargando video desde: ${url}`);
    const filePath = path.join("/tmp", "video_to_upload.mp4");

    try {
        const response = await fetch(url);
        log(`Estado HTTP video: ${response.status}`);

        if (!response.ok) throw new Error("No se pudo descargar el video.");

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        log(`Video guardado en: ${filePath}`);
        return filePath;

    } catch (err) {
        log("ERROR AL DESCARGAR VIDEO:");
        log(err.message);
        throw err;
    }
}

// ===============================
// BOTÓN DE PUBLICAR (2026)
// ===============================
async function getTweetButton(page) {
    log("Buscando botón de publicar...");

    const selectors = [
        'button[data-testid="tweetButton"]',
        'button[data-testid="tweetButtonInline"]',
        'div[data-testid="tweetButton"]',
        'div[data-testid="tweetButtonInline"]',
        'button[aria-label="Post"]',
        'div[aria-label="Post"]'
    ];

    for (const sel of selectors) {
        log(`Probando selector: ${sel}`);
        const btn = await page.$(sel);
        if (btn) {
            log(`Botón encontrado con selector: ${sel}`);
            return btn;
        }
    }

    log("❌ Ningún selector coincidió con el botón de publicar.");
    return null;
}

// ===============================
// PUBLICAR TEXTO
// ===============================
async function publishText(page, text) {
    log("=== PUBLICANDO TEXTO ===");
    log(`Texto a publicar: "${text}"`);

    await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" });
    log(`URL actual: ${page.url()}`);

    log("Esperando textbox...");
    await page.waitForSelector('div[role="textbox"]');
    log("Textbox encontrado.");

    await page.type('div[role="textbox"]', text);
    log("Texto escrito en el composer.");

    const tweetButton = await getTweetButton(page);
    if (!tweetButton) throw new Error("No se encontró el botón de publicar en X.");

    log("Haciendo click en el botón de publicar...");
    await tweetButton.click();

    log("Esperando navegación después de publicar...");
    try {
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });
        log("Navegación detectada. Tweet publicado.");
    } catch (err) {
        log("❌ ERROR: X NO NAVEGÓ DESPUÉS DEL CLICK.");
        log("Esto significa que el tweet NO se publicó.");
        throw err;
    }
}

// ===============================
// PUBLICAR IMAGEN
// ===============================
async function publishImage(page, text, imagePath) {
    log("=== PUBLICANDO IMAGEN ===");
    log(`Texto: "${text}"`);
    log(`Imagen: ${imagePath}`);

    await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" });

    const input = await page.$('input[type="file"]');
    log("Subiendo imagen...");
    await input.uploadFile(imagePath);

    log("Imagen subida.");

    await page.waitForSelector('div[role="textbox"]');
    await page.type('div[role="textbox"]', text);
    log("Texto escrito.");

    const tweetButton = await getTweetButton(page);
    if (!tweetButton) throw new Error("No se encontró el botón de publicar en X.");

    log("Click en publicar...");
    await tweetButton.click();

    log("Esperando navegación...");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });

    log("Imagen + texto publicado.");
}

// ===============================
// PUBLICAR VIDEO
// ===============================
async function publishVideo(page, text, videoPath) {
    log("=== PUBLICANDO VIDEO ===");
    log(`Texto: "${text}"`);
    log(`Video: ${videoPath}`);

    await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" });

    const input = await page.$('input[type="file"]');
    log("Subiendo video...");
    await input.uploadFile(videoPath);

    log("Video subido. Esperando procesamiento...");
    await wait(8000);

    await page.waitForSelector('div[role="textbox"]');
    await page.type('div[role="textbox"]', text);
    log("Texto escrito.");

    const tweetButton = await getTweetButton(page);
    if (!tweetButton) throw new Error("No se encontró el botón de publicar en X.");

    log("Click en publicar...");
    await tweetButton.click();

    log("Esperando navegación...");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });

    log("Video + texto publicado.");
}

// ===============================
// PUBLICAR RESPUESTA EN HILO
// ===============================
async function publishReply(page, text, imagePath = null, videoPath = null) {
    log("=== PUBLICANDO RESPUESTA EN HILO ===");
    log(`Texto: "${text}"`);

    await page.waitForSelector('div[data-testid="reply"]');
    await page.click('div[data-testid="reply"]');
    log("Click en botón de responder.");

    await page.waitForSelector('div[role="textbox"]');

    if (imagePath) {
        const input = await page.$('input[type="file"]');
        log("Subiendo imagen en hilo...");
        await input.uploadFile(imagePath);
        log("Imagen subida.");
    }

    if (videoPath) {
        const input = await page.$('input[type="file"]');
        log("Subiendo video en hilo...");
        await input.uploadFile(videoPath);
        log("Video subido.");
        await wait(8000);
    }

    await page.type('div[role="textbox"]', text);
    log("Texto escrito en respuesta.");

    const tweetButton = await getTweetButton(page);
    if (!tweetButton) throw new Error("No se encontró el botón de publicar en X.");

    log("Click en publicar respuesta...");
    await tweetButton.click();

    log("Esperando navegación...");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 });

    log("Respuesta publicada.");
}

// ===============================
// MAIN FINAL
// ===============================
async function main() {
    log("=== BOT INICIADO ===");

    try {
        const posts = await getPendingPosts();

        if (!posts.length) {
            log("No hay posts pendientes.");
            return;
        }

        log(`Posts encontrados: ${posts.length}`);

        const browser = await puppeteer.connect({
            browserWSEndpoint: process.env.BROWSERLESS_URL
        });

        const page = await browser.newPage();

        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        );

        log("Página creada. Sesión debería estar activa.");

        for (const post of posts) {
            try {
                log(`=== PUBLICANDO POST ID ${post.id} ===`);

                if (post.video_url) {
                    const videoPath = await downloadVideo(post.video_url);
                    await publishVideo(page, post.text, videoPath);
                    fs.unlinkSync(videoPath);

                } else if (post.image_url) {
                    const imagePath = await downloadImage(post.image_url);
                    await publishImage(page, post.text, imagePath);
                    fs.unlinkSync(imagePath);

                } else {
                    await publishText(page, post.text);
                }

                if (post.thread && post.thread.length > 0) {
                    log(`Publicando hilo de ${post.thread.length} tweets...`);

                    for (const reply of post.thread) {
                        try {
                            let imagePath = null;
                            let videoPath = null;

                            if (reply.image_url) imagePath = await downloadImage(reply.image_url);
                            if (reply.video_url) videoPath = await downloadVideo(reply.video_url);

                            await publishReply(page, reply.text, imagePath, videoPath);

                            if (imagePath) fs.unlinkSync(imagePath);
                            if (videoPath) fs.unlinkSync(videoPath);

                            await wait(2000);

                        } catch (err) {
                            log("ERROR PUBLICANDO TWEET DEL HILO:");
                            log(err.message);
                        }
                    }

                    log("Hilo publicado correctamente.");
                }

                await markAsPublished(post.id);
                await wait(2000);

            } catch (err) {
                log(`ERROR PUBLICANDO POST ${post.id}:`);
                log(err.message);
            }
        }

        await browser.close();
        log("=== BOT FINALIZADO ===");

    } catch (err) {
        log("ERROR CRÍTICO EN MAIN:");
        log(err.message);
        log(err.stack);
    }
}

main();
