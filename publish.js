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

// ===============================
// GET PENDING POSTS
// ===============================
async function getPendingPosts() {
    const url = `${process.env.API_URL}/get_pending_posts.php?token=${process.env.API_TOKEN}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        log("Posts pendientes recibidos.");
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
    try {
        const res = await fetch(`${process.env.API_URL}/update_post_status.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: id,
                token: process.env.API_TOKEN
            })
        });

        const data = await res.json();
        log(`Post ${id} marcado como publicado. Respuesta: ${JSON.stringify(data)}`);

    } catch (err) {
        log("ERROR AL MARCAR COMO PUBLICADO:");
        log(err.message);
    }
}

// ===============================
// DESCARGAR IMAGEN
// ===============================
async function downloadImage(url) {
    const filePath = path.join("/tmp", "image_to_upload.jpg");

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("No se pudo descargar la imagen.");

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        log("Imagen descargada correctamente.");
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
    const filePath = path.join("/tmp", "video_to_upload.mp4");

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("No se pudo descargar el video.");

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        log("Video descargado correctamente.");
        return filePath;

    } catch (err) {
        log("ERROR AL DESCARGAR VIDEO:");
        log(err.message);
        throw err;
    }
}

// ===============================
// PUBLICAR TEXTO
// ===============================
async function publishText(page, text) {
    log("Publicando texto...");

    await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" });

    await page.waitForSelector('div[role="textbox"]');
    await page.type('div[role="textbox"]', text);

    await page.waitForSelector('button[data-testid="tweetButton"]');
    await page.click('button[data-testid="tweetButton"]');

    log("Texto publicado correctamente.");
}

// ===============================
// PUBLICAR IMAGEN
// ===============================
async function publishImage(page, text, imagePath) {
    log("Publicando imagen...");

    await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" });

    const input = await page.$('input[type="file"]');
    await input.uploadFile(imagePath);

    log("Imagen subida.");

    await page.waitForSelector('div[role="textbox"]');
    await page.type('div[role="textbox"]', text);

    await page.waitForSelector('button[data-testid="tweetButton"]');
    await page.click('button[data-testid="tweetButton"]');

    log("Imagen + texto publicado correctamente.");
}

// ===============================
// PUBLICAR VIDEO
// ===============================
async function publishVideo(page, text, videoPath) {
    log("Publicando video...");

    await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" });

    const input = await page.$('input[type="file"]');
    await input.uploadFile(videoPath);

    log("Video subido. Procesando...");
    await page.waitForTimeout(8000);

    await page.waitForSelector('div[role="textbox"]');
    await page.type('div[role="textbox"]', text);

    await page.waitForSelector('button[data-testid="tweetButton"]');
    await page.click('button[data-testid="tweetButton"]');

    log("Video + texto publicado correctamente.");
}

// ===============================
// PUBLICAR ENCUESTA (ACTUALIZADO 2026)
// ===============================
async function publishPoll(page, text, poll) {
    log("Publicando encuesta...");

    await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" });

    await page.waitForSelector('div[role="textbox"]');
    await page.type('div[role="textbox"]', text);

    // NUEVO SELECTOR 2026
    let pollButton = await page.$('div[data-testid="addPoll"]');

    if (!pollButton) {
        pollButton = await page.$('button[data-testid="addPoll"]');
    }

    if (!pollButton) {
        throw new Error("No se encontró el botón de encuesta en X.");
    }

    await pollButton.click();

    // Rellenar opciones
    for (let i = 0; i < poll.options.length; i++) {
        await page.waitForSelector(`input[data-testid="pollOption${i}"]`);
        await page.type(`input[data-testid="pollOption${i}"]`, poll.options[i]);
    }

    // Duración
    await page.waitForSelector('select[data-testid="pollDuration"]');
    await page.select('select[data-testid="pollDuration"]', poll.duration.toString());

    // Publicar
    await page.waitForSelector('button[data-testid="tweetButton"]');
    await page.click('button[data-testid="tweetButton"]');

    log("Encuesta publicada correctamente.");
}

// ===============================
// PUBLICAR RESPUESTA EN HILO
// ===============================
async function publishReply(page, text, imagePath = null, videoPath = null) {
    log("Publicando respuesta en hilo...");

    await page.waitForSelector('div[data-testid="reply"]');
    await page.click('div[data-testid="reply"]');

    await page.waitForSelector('div[role="textbox"]');

    if (imagePath) {
        const input = await page.$('input[type="file"]');
        await input.uploadFile(imagePath);
        log("Imagen subida en hilo.");
    }

    if (videoPath) {
        const input = await page.$('input[type="file"]');
        await input.uploadFile(videoPath);
        log("Video subido en hilo.");
        await page.waitForTimeout(8000);
    }

    await page.type('div[role="textbox"]', text);

    await page.waitForSelector('button[data-testid="tweetButton"]');
    await page.click('button[data-testid="tweetButton"]');

    log("Respuesta publicada.");
}

// ===============================
// MAIN FINAL
// ===============================
async function main() {
    log("Bot iniciado.");

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

        for (const post of posts) {
            try {
                log(`Publicando post ID ${post.id}`);

                if (post.poll) {
                    await publishPoll(page, post.text, post.poll);

                } else if (post.video_url) {
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

                            await page.waitForTimeout(2000);

                        } catch (err) {
                            log("ERROR PUBLICANDO TWEET DEL HILO:");
                            log(err.message);
                        }
                    }

                    log("Hilo publicado correctamente.");
                }

                await markAsPublished(post.id);
                await page.waitForTimeout(2000);

            } catch (err) {
                log(`ERROR PUBLICANDO POST ${post.id}:`);
                log(err.message);
            }
        }

        await browser.close();
        log("Bot finalizado correctamente.");

    } catch (err) {
        log("ERROR CRÍTICO EN MAIN:");
        log(err.message);
        log(err.stack);
    }
}

main();
