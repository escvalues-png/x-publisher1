import fetch from "node-fetch";
import dotenv from "dotenv";

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
// 2. MAIN LOOP
// ===============================
async function main() {
    console.log("Servidor auxiliar iniciado.");

    const posts = await getPendingPosts();

    if (!posts.length) {
        console.log("No hay posts pendientes.");
        return;
    }

    console.log("Posts encontrados:", posts.length);
}

main();
