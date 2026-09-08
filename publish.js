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

    // Abrir navegador
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"]
    });

    const page = await browser.newPage();

    // Iniciar sesión
    await login(page);

    console.log("Todo listo para publicar (aún no publicamos).");

    await browser.close();
}

main();
