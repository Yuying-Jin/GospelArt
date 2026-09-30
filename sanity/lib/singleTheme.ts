type LocaleValue = {zhTW?: string; zhCN?: string; en?: string}

const SEPARATORS = /[,，、;；]/

/** A theme is one idea: "Sin, Repentance, Grace" is three themes, not one. */
export function isSingleTheme(value?: LocaleValue): true | string {
    const joined = [value?.zhTW, value?.zhCN, value?.en].some((title) => title && SEPARATORS.test(title))
    return joined
        ? 'One theme per entry — create each theme separately instead of joining them with commas.'
        : true
}
