import type {ArraySchemaType, FieldProps} from 'sanity'

/**
 * Adds the number of items to the title of every list field, registered once
 * in `sanity.config.ts`, so it stays in view however the list is expanded.
 * Rich text is an array too, of blocks, and is left alone.
 */
export function ItemCountField(props: FieldProps) {
    const {schemaType, value, title} = props
    if (schemaType.jsonType !== 'array' || !Array.isArray(value) || !value.length || !title) {
        return props.renderDefault(props)
    }
    const isRichText = (schemaType as ArraySchemaType).of.some(
        (member) => member.name === 'block' || member.type?.name === 'block',
    )
    if (isRichText) return props.renderDefault(props)
    return props.renderDefault({...props, title: `${title} (${value.length})`})
}
