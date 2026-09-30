import React from 'react'
import type {StringInputProps} from 'sanity'
import {NEWS_CATEGORY_CONFIG} from '../../lib/newsCategories'

/** The radio list, then when to use each category; follows the shared list. */
export function NewsCategoryInput(props: StringInputProps) {
    return (
        <div style={{display: 'grid', gap: '1em'}}>
            {props.renderDefault(props)}
            <div style={{display: 'grid', gap: '0.6em', fontSize: '0.8125rem', lineHeight: 1.5, opacity: 0.8}}>
                {NEWS_CATEGORY_CONFIG.map((category) => (
                    <div key={category.id}>
                        <strong>{category.label.en}</strong> — {category.guide}
                    </div>
                ))}
            </div>
        </div>
    )
}
