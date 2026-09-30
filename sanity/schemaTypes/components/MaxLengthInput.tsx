import React, {createContext, useCallback, useContext, useEffect, useRef} from 'react'
import {Stack, Text} from '@sanity/ui'
import {useToast} from '@sanity/ui/toast'
import type {InputProps} from 'sanity'
import {limitFor, maxLengthOf, richTextLength, type Limit} from '../../lib/maxLength'

/**
 * Enforces `options.maxLength` (set with `withMaxLength`) on every input,
 * registered once in `sanity.config.ts`. A localized field carries its limit
 * on the object, so objects pass theirs down to the fields inside them.
 *
 * Plain text relies on the browser's `maxlength`, which refuses the extra
 * characters and truncates a paste; this only adds the toast. Rich text has no
 * such attribute, so insertions are cancelled here before the editor sees
 * them. Chinese typed through an IME cannot be cancelled mid-composition, so
 * rich text can still overshoot that way — validation reports it.
 */
const MaxLengthContext = createContext<Limit | undefined>(undefined)

type Editable = HTMLInputElement | HTMLTextAreaElement

const isEditable = (target: EventTarget | null): target is Editable =>
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

const selectedLength = (el: Editable) => (el.selectionEnd ?? 0) - (el.selectionStart ?? 0)

/** "120 / 300" under the input, right-aligned; caution-coloured at the limit. */
function Counter({length, max}: {length: number; max: number}) {
    const full = length >= max
    return (
        <Text
            size={1}
            align="right"
            muted={!full}
            style={full ? {color: 'var(--card-badge-caution-fg-color)'} : undefined}
        >
            {length.toLocaleString()} / {max.toLocaleString()}
        </Text>
    )
}

function useLimitToast(max: number) {
    const toast = useToast()
    return useCallback(
        (description: string) =>
            toast.push({
                id: 'max-length',
                status: 'warning',
                title: `Limit reached: ${max} characters`,
                description,
            }),
        [max, toast],
    )
}

/** Native capture listeners, so they run before the editor's own handlers. */
function useCaptureListeners(
    ref: React.RefObject<HTMLDivElement | null>,
    onBeforeInput: (event: InputEvent) => void,
    onPaste: (event: ClipboardEvent) => void,
) {
    useEffect(() => {
        const node = ref.current
        if (!node) return
        node.addEventListener('beforeinput', onBeforeInput, true)
        node.addEventListener('paste', onPaste, true)
        return () => {
            node.removeEventListener('beforeinput', onBeforeInput, true)
            node.removeEventListener('paste', onPaste, true)
        }
    }, [ref, onBeforeInput, onPaste])
}

function TextLimit({max, props}: {max: number; props: InputProps}) {
    const ref = useRef<HTMLDivElement>(null)
    const warn = useLimitToast(max)

    const onBeforeInput = useCallback(
        (event: InputEvent) => {
            if (!isEditable(event.target) || !event.inputType.startsWith('insert')) return
            if (event.inputType === 'insertFromPaste' || event.isComposing) return
            const el = event.target
            const adding = event.data?.length ?? 1
            if (el.value.length - selectedLength(el) + adding > max) {
                warn('Further text was not added.')
            }
        },
        [max, warn],
    )

    const onPaste = useCallback(
        (event: ClipboardEvent) => {
            if (!isEditable(event.target)) return
            const el = event.target
            const adding = event.clipboardData?.getData('text').length ?? 0
            if (el.value.length - selectedLength(el) + adding > max) {
                warn('The pasted text was cut off at the limit.')
            }
        },
        [max, warn],
    )

    useCaptureListeners(ref, onBeforeInput, onPaste)

    const limited = {...props, elementProps: {...props.elementProps, maxLength: max}} as unknown as InputProps
    const length = typeof props.value === 'string' ? props.value.length : 0
    return (
        <Stack ref={ref} gap={2}>
            {props.renderDefault(limited)}
            <Counter length={length} max={max} />
        </Stack>
    )
}

function RichTextLimit({max, props}: {max: number; props: InputProps}) {
    const ref = useRef<HTMLDivElement>(null)
    const warn = useLimitToast(max)
    const length = richTextLength(props.value)

    const onBeforeInput = useCallback(
        (event: InputEvent) => {
            if (event.isComposing || !event.inputType.startsWith('insert')) return
            if (event.inputType === 'insertFromPaste') return
            const adding = event.data?.length ?? 0
            if (adding > 0 && length + adding > max) {
                event.preventDefault()
                event.stopPropagation()
                warn('Further text was not added.')
            }
        },
        [length, max, warn],
    )

    const onPaste = useCallback(
        (event: ClipboardEvent) => {
            const adding = event.clipboardData?.getData('text').length ?? 0
            if (length + adding > max) {
                event.preventDefault()
                event.stopPropagation()
                warn(`The paste was not added: only ${Math.max(0, max - length)} characters are left.`)
            }
        },
        [length, max, warn],
    )

    useCaptureListeners(ref, onBeforeInput, onPaste)

    return (
        <Stack ref={ref} gap={2}>
            {props.renderDefault(props)}
            <Counter length={length} max={max} />
        </Stack>
    )
}

export function MaxLengthInput(props: InputProps) {
    const inherited = useContext(MaxLengthContext)
    const own = maxLengthOf(props.schemaType.options)
    const {jsonType} = props.schemaType

    // Objects hand their own limit (or none) to the fields inside, so a limit
    // never leaks further down than the localized field that set it.
    if (jsonType === 'object') {
        return (
            <MaxLengthContext.Provider value={own}>
                {props.renderDefault(props)}
            </MaxLengthContext.Provider>
        )
    }

    const limit = own ?? inherited
    if (limit === undefined) return props.renderDefault(props)
    // A localized field's inputs sit at `…field.zhTW` / `.zhCN` / `.en`.
    const max = limitFor(limit, props.path[props.path.length - 1])
    if (jsonType === 'string') return <TextLimit max={max} props={props} />
    if (jsonType === 'array') return <RichTextLimit max={max} props={props} />
    return props.renderDefault(props)
}
