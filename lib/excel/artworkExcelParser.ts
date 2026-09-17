// /lib/excel/artworkExcelParser.ts
import { keyMap } from "@/constants/artworkKeyMap";
import * as XLSX from "xlsx";

/** Maps one workbook row onto the app's field names via `keyMap`. */
export function mapExcelRow(row: Record<string, string>) {
    const mapped: Record<string, string> = {};

    for (const key in row) {
        const mappedKey = keyMap[key] || key;

        let value = row[key];

        // Dates arrive as Excel serial numbers.
        if (mappedKey === "date" && typeof value === "number") {
            value = XLSX.SSF.format("yyyy-mm-dd", value);
        }

        // Dropbox share links (dl=0) only render inline as raw=1.
        if (mappedKey === "image_path" && typeof value === "string") {
            value = value.replace("dl=0", "raw=1");
        }

        mapped[mappedKey] = value;
    }

    return mapped;
}

/** Parses the first worksheet, newest artwork first. */
export function parseExcel(buffer: ArrayBuffer) {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    return rows
        .map(mapExcelRow)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
