import { readFile, writeFile } from "fs/promises";
import http from "http";
import path from "path";
import crypto from "crypto";

const PORT = 3000;
const DATA_FILE = path.join("data", "links.json");

// Load links from JSON file
let loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        throw error;
    }
};


let saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links, null, 2));
};

const server = http.createServer(async (req, res) => {
    try {
        if (req.method === "GET") {
            if (req.url === "/") {
                const data = await readFile(path.join("public", "index.html"));
                res.writeHead(200, { "Content-Type": "text/html" });
                return res.end(data);
            }

            if (req.url === "/style.css") {
                const cssData = await readFile(path.join("public", "style.css"));
                res.writeHead(200, { "Content-Type": "text/css" });
                return res.end(cssData);
            }

            // Redirect shortcodes
            const shortcode = req.url.slice(1); 
            const links = await loadLinks();

            if (links[shortcode]) {
                res.writeHead(302, { Location: links[shortcode] });
                return res.end();
            }

            res.writeHead(404, { "Content-Type": "text/html" });
            return res.end("404 Page Not Found");
        }

        if (req.method === "POST" && req.url === "/shorten") {
            const links = await loadLinks();
            let body = "";

            req.on("data", (chunk) => {
                body += chunk;
            });

            req.on("end", async () => {
                try {
                    const { url, shortcode } = JSON.parse(body);

                    if (!url) {
                        res.writeHead(400, { "Content-Type": "text/plain" });
                        return res.end("URL is required");
                    }

                    const finalShortCode = shortcode || crypto.randomBytes(4).toString("hex");

                    if (links[finalShortCode]) {
                        res.writeHead(409, { "Content-Type": "text/plain" });
                        return res.end("Shortcode already exists. Please choose another.");
                    }

                    links[finalShortCode] = url;
                    await saveLinks(links);

                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        success: true,
                        shortcode: finalShortCode,
                        shortUrl: `http://localhost:${PORT}/${finalShortCode}`
                    }));

                } catch (error) {
                    res.writeHead(400, { "Content-Type": "text/plain" });
                    res.end("Invalid JSON data");
                }
            });
        }

    } catch (error) {
        console.error(error);
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("Internal Server Error");
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
