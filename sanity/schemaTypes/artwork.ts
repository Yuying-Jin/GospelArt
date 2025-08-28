import { defineField, defineType } from "sanity";

export default defineType({
    name: "artwork",
    title: "Artwork",
    type: "document",
    fields: [
        defineField({
            name: "bibleReference",
            title: "Bible Reference",
            type: "string",
        }),
        defineField({
            name: "theme",
            title: "Artwork Theme",
            type: "string",
        }),
        defineField({
            name: "description",
            title: "Artwork Description",
            type: "text",
        }),
        defineField({
            name: "date",
            title: "Date of Artwork",
            type: "date",
        }),
        defineField({
            name: "image",
            title: "Artwork Image",
            type: "image",
            options: { hotspot: true },
        }),
        defineField({
            name: "selectionCriteria",
            title: "Selection Criteria",
            type: "string",
            options: {
                list: ["Y", "N"],
            },
        }),
        defineField({
            name: "overallSelection",
            title: "Overall Selection",
            type: "string",
            options: {
                list: ["S1", "S2", "S3", "N"],
            },
        }),
        defineField({
            name: "quality",
            title: "Quality",
            type: "string",
            options: { list: ["H", "M", "L"] },
        }),
        defineField({
            name: "repetition",
            title: "Repetition",
            type: "string",
            options: { list: ["H", "M", "L"] },
        }),
        defineField({
            name: "creativity",
            title: "Creativity",
            type: "string",
            options: { list: ["H", "M", "L"] },
        }),
    ],
});
