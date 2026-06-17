import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import chromadb from 'chromadb';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { text } from "stream/consumers"; //text brute
import { TextLoader } from "langchain/document_loaders/fs/text"; //text
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";


function add_context(list_file_path) {
    // --- CONFIGURATION & LECTURE JSON ---
    const configPath = path.resolve(proccess.cwd(), 'Config.json');
    const fileData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(fileData);
    //Destination
    const DossierRagDB = config["VectDataBase"];
    console.log("1. Initialisation Chroma...");
    const embeddingsLocal = undefined;

    // Liste pour accumuler tous les morceaux de texte
    let tousLesChunks = [];
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
    });

    console.log("2. Lecture et découpage des fichiers PDF...");

// Vérification et création du dossier source (équivalent de os.makedirs)
    if (!fs.existsSync(DOSSIER_SRC)) {
        fs.mkdirSync(DOSSIER_SRC, { recursive: true });
        console.log(`Le dossier '${DOSSIER_SRC}' a été créé. Pensez à y mettre vos PDF !`);
    }

// Lecture du contenu du dossier (équivalent de os.listdir)
    const fichiers = fs.readdirSync(DOSSIER_SRC);

    for (const nomFichier of fichiers) {
        const cheminFichier = path.join(DOSSIER_SRC, nomFichier);
        const statut = fs.statSync(cheminFichier);

        // On ignore les dossiers (équivalent de os.path.isdir)
        if (statut.isDirectory()) {
            continue;
        }

        if (nomFichier.endsWith(".pdf")) {
            console.log(` -> Traitement de : ${nomFichier}`);
            try {
                const loader = new PDFLoader(cheminFichier);
                const docs = await loader.load();
                const chunks = await textSplitter.splitDocuments(docs);
                tousLesChunks.push(...chunks); // .push(...arr) équivaut au .extend() de Python
            } catch (e) {
                console.error(`    [Erreur] Impossible de lire le PDF ${nomFichier} :`, e.message);
            }
        }
        else if (nomFichier.endsWith(".htm") || nomFichier.endsWith(".html")) {
            console.log(` -> Traitement HTML : ${nomFichier}`);
            try {
                // 1. Lecture du fichier HTML (équivalent de open avec utf-8)
                const contenuHtml = fs.readFileSync(cheminFichier, 'utf-8');

                // 2. Utilisation de Cheerio (équivalent de BeautifulSoup)
                const $ = cheerio.load(contenuHtml);

                // Extraction du texte propre (en remplaçant les espaces blancs multiples)
                const textePropre = $('body').text().replace(/\s+/g, ' ').trim();

                // 3. Extraction du titre pour les métadonnées
                const titre = $('title').text() || nomFichier;

                // 4. Encapsulation dans un Document LangChain
                const documentNettoye = [
                    new Document({
                        pageContent: textePropre,
                        metadata: { source: nomFichier, title: titre }
                    })
                ];

                // 5. Découpage et ajout
                const chunks = await textSplitter.splitDocuments(documentNettoye);
                tousLesChunks.push(...chunks);
            } catch (e) {
                console.log(`    [Erreur] Impossible de lire le HTML ${nomFichier} : ${e.message}`);
            }
        }
        else {
            console.log(` -> Traitement (Mode Texte Brut) : ${nomFichier}`);
            try {
                // TextLoader en JS gère l'encodage textuel de base
                const loader = new TextLoader(cheminFichier);
                const docs = await loader.load();
                const chunks = await textSplitter.splitDocuments(docs);
                tousLesChunks.push(...chunks);
            } catch (e) {
                console.log(`    [Erreur] Impossible de lire le fichier ${nomFichier} en mode texte : ${e.message}`);
            }
        }
    }

// --- INITIALISATION BASE VECTORIELLE ---

    if (tousLesChunks.length === 0) {
        console.log("Attention : Aucun morceau de texte trouvé. Votre dossier source est-il vide ?");
    } else {
        console.log(`\n3. Création de la base vectorisée avec ${tousLesChunks.length} morceaux...`);

        // Extraction des données brutes
        const textes = tousLesChunks.map(doc => doc.pageContent);
        const metadatas = tousLesChunks.map(doc => doc.metadata);
        const ids = tousLesChunks.map((_, i) => `id_${i}`);

        try {
            // Utilisation du client persistant Chroma
            const client = new chromadb.ChromaClient({ path: DOSSIER_BASE_VECTORIELLE });

            const collection = await client.getOrCreateCollection({
                name: "ma_collection"
                // embeddingFunction: optionnel si tu veux laisser celle par défaut de Chroma
            });

            // Injection des données (Requiert de l'asynchrone en JS !)
            await collection.add({
                ids: ids,
                documents: textes,
                metadatas: metadatas
            });

            console.log(`\n[SUCCÈS] Votre dossier de base vectorisée a été créé : '${DOSSIER_BASE_VECTORIELLE}' !`);
        } catch (e) {
            console.error("Erreur lors de l'injection dans Chroma :", e);
        }
    }
}



