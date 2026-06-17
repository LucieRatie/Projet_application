import fs from 'fs';
import path from 'path';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { text } from "stream/consumers"; //text brute
import { TextLoader } from "langchain/document_loaders/fs/text"; //text


