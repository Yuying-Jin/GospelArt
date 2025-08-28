// app/api/artworks/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { parseExcel } from "@/lib/excel/artworkExcelParser";
import {Dropbox} from "dropbox";

export async function GET() {

    const dbx = new Dropbox({ accessToken: process.env.DROPBOX_TOKEN! });
    const sharedLink = "https://www.dropbox.com/scl/fi/gl2vh68g4311cmpf0999t/Gospel-Artwork-Archives-2025-06-08.xlsx?rlkey=7nc2tibarg8gdeync9zpqnvyp&st=8d5abum4&dl=1";

    // 1. 下载 Excel 文件
    const res = await fetch(sharedLink);
    const buffer = await res.arrayBuffer();

    // 2. 解析 Excel
    const data = parseExcel(buffer);

    // 3. 筛选 Selection Criteria = Y
    const filteredData = data.filter((artwork) => artwork.selection_criteria === "Y");

    // 4. 获取图片临时链接
    const artworksWithImages = await Promise.all(
        filteredData.map(async (artwork) => {
            try {
                const dropboxPath = decodeURIComponent(new URL(artwork.image_path).pathname);
                const link = await dbx.filesGetTemporaryLink({ path: dropboxPath });
                return { ...artwork, image_path: link.result.link };
            } catch (err) {
                console.error("Dropbox image error:", err);
                return artwork;
            }
        })
    );
    return NextResponse.json(artworksWithImages);
}
