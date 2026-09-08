import fetch from "node-fetch";
import dotenv from "dotenv";
import puppeteer from "puppeteer";

dotenv.config();

// ===============================
// 1. GET PENDING POSTS
// ===============================
async function getPendingPosts() {
    const url = `${process.env.API_URL}/get_pending_posts.php?token=${process.env.API_TOKEN}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("Posts pendientes:", data);
        return data;
    } catch (err) {
        console.error("Error al obtener posts:", err);
        return [];
    }
}

// ===============================
// DESCARGAR IMAGEN
// ===============================
import fs from "fs";
import path from "path";

async function downloadImage(url) {
    const filePath = path.join("/tmp", "image_to_upload.jpg");

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    fs.writeFileSync(filePath, Buffer.from(buffer));

    console.log("Imagen descargada:", filePath);
    return filePath;
}


// ===============================
// 2. LOGIN TO X
// ===============================
async function login(page) {
    console.log("Iniciando sesión en X...");

    await page.goto("https://x.com/login", { waitUntil: "networkidle2" });

    await page.waitForSelector('input[name="text"]');
    await page.type('input[name="text"]', process.env.X_USERNAME);
    await page.keyboard.press("Enter");

    await page.waitForTimeout(2000);

    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', process.env.X_PASSWORD);
    await page.keyboard.press("Enter");

    await page.waitForNavigation();
    console.log("Sesión iniciada correctamente.");
}

// ===============================
// 3. PUBLISH TEXT ONLY
// ===============================
async function publishText(page, text) {
    console.log("Publicando texto...");

    // Abrir el composer
    await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" });

    // Escribir el texto
    await page.waitForSelector('div[role="textbox"]');
    await page.type('div[role="textbox"]', text);

    // Publicar
    await page.waitForSelector('button[data-testid="tweetButton"]');
    await page.click('button[data-testid="tweetButton"]');

    console.log("Texto publicado correctamente.");
}

// ===============================
// PUBLICAR IMAGEN + TEXTO
// ===============================
async function publishImage(page, text, imagePath) {
    console.log("Publicando imagen...");

    // Abrir composer
    await page.goto("https://x.com/compose/tweet", { waitUntil: "networkidle2" });

    // Subir imagen
    const input = await page.$('input[type="file"]');
    await input.uploadFile(imagePath);

    console.log("Imagen subida.");

    // Escribir texto
    await page.waitForSelector('div[role="textbox"]');
    await page.type('div[role="textbox"]', text);

    // Publicar
    await page.waitForSelector('button[data-testid="tweetButton"]');
    await page.click('button[data-testid="tweetButton"]');

    console.log("Imagen + texto publicado correctamente.");
}

// ===============================
// 3. MAIN LOOP
// ===============================
async function main() {
    console.log("Servidor auxiliar iniciado.");

    const posts = await getPendingPosts();

    if (!posts.length) {
        console.log("No hay posts pendientes.");
        return;
    }

    console.log("Posts encontrados:", posts.length);

    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"]
    });

    const page = await browser.newPage();

    await login(page);

    const post = posts[0];

    if (post.image_url) {
        console.log("Post con imagen detectado.");

        const imagePath = await downloadImage(post.image_url);

        await publishImage(page, post.text, imagePath);

        fs.unlinkSync(imagePath);
    } else {
        console.log("Post sin imagen. Publicando texto...");
        await publishText(page, post.text);
    }

    await browser.close();
}


main();
