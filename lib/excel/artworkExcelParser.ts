// /lib/excel/artworkExcelParser.ts
import { keyMap } from "@/constants/artworkKeyMap";
import * as XLSX from "xlsx";

/**
 * 将 Excel 中的一行数据映射成前端可用的字段名
 * 并进行必要的数据转换（日期、图片链接等）
 * @param row Excel 中的一行数据，key 为列名，value 为单元格内容
 * @returns 映射后的对象，key 为前端统一字段名
 */
export function mapExcelRow(row: Record<string, any>) {
    const mapped: Record<string, any> = {};

    // 遍历每一个 Excel 列
    for (const key in row) {
        // 使用 keyMap 将 Excel 列名映射为前端字段名
        const mappedKey = keyMap[key] || key;

        let value = row[key];

        // 如果是日期字段（Excel 日期序号），转换为 YYYY-MM-DD 格式
        if (mappedKey === "date" && typeof value === "number") {
            value = XLSX.SSF.format("yyyy-mm-dd", value);
        }

        // 如果是图片路径字段，将 Dropbox 预览链接(dl=0)替换为直接显示的链接(raw=1)
        if (mappedKey === "image_path" && typeof value === "string") {
            value = value.replace("dl=0", "raw=1");
        }

        // 保存映射后的字段和值
        mapped[mappedKey] = value;
    }

    return mapped;
}

/**
 * 将 Excel 文件的 ArrayBuffer 解析为前端可用的数据数组
 * @param buffer Excel 文件的二进制数据
 * @returns 映射后的对象数组
 */
export function parseExcel(buffer: ArrayBuffer) {
    // 读取 Excel 工作簿
    const workbook = XLSX.read(buffer, { type: "array" });
    // 获取第一个工作表
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // 将工作表转换为 JSON 数组，每一行是一个对象
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
    // 对每一行进行映射，返回前端统一字段格式
    return rows
        .map(mapExcelRow)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
