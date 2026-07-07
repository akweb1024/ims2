'use client';

import React, { forwardRef, useRef } from 'react';
import { Braces } from 'lucide-react';

interface HtmlCodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Highlighting is color-only — never weight, padding, or spacing — because this layer sits
// behind a transparent, otherwise-identical <textarea>. Any change to glyph width or line
// flow here would desync the (invisible) real caret from the (visible) highlighted text.
function highlight(raw: string): string {
    const escaped = escapeHtml(raw);
    return escaped.replace(/(&lt;\/?[a-zA-Z][\s\S]*?&gt;)|(\{\{[^}]+\}\})/g, (_m, tag, code) => {
        if (code) return `<span class="text-amber-300">${code}</span>`;
        const withAttrs = (tag as string).replace(
            /([a-zA-Z-]+)(=)("[^"]*")/g,
            '<span class="text-sky-300">$1</span><span class="text-slate-500">$2</span><span class="text-emerald-300">$3</span>'
        );
        return withAttrs
            .replace(/^(&lt;\/?)([a-zA-Z][\w-]*)/, '<span class="text-slate-500">$1</span><span class="text-sky-400">$2</span>')
            .replace(/(\/?&gt;)$/, '<span class="text-slate-500">$1</span>');
    });
}

const MONO_METRICS: React.CSSProperties = { fontSize: 13, lineHeight: '21px', tabSize: 2 };

/** A dark, line-numbered HTML source editor with lightweight tag/{{shortcode}} highlighting. */
const HtmlCodeEditor = forwardRef<HTMLTextAreaElement, HtmlCodeEditorProps>(
    ({ value, onChange, placeholder, className }, ref) => {
        const preRef = useRef<HTMLPreElement>(null);
        const gutterRef = useRef<HTMLPreElement>(null);
        const innerRef = useRef<HTMLTextAreaElement | null>(null);

        const setRefs = (node: HTMLTextAreaElement | null) => {
            innerRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        };

        const lineCount = Math.max(1, value.split('\n').length);
        const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

        const syncScroll = () => {
            const ta = innerRef.current;
            if (!ta) return;
            if (preRef.current) { preRef.current.scrollTop = ta.scrollTop; preRef.current.scrollLeft = ta.scrollLeft; }
            if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
        };

        return (
            <div className={`relative h-[400px] rounded-2xl overflow-hidden border border-secondary-800 bg-secondary-900 shadow-inner focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500/60 transition-all ${className || ''}`}>
                <span className="absolute top-3 right-4 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-secondary-500/70 select-none pointer-events-none z-10">
                    <Braces size={11} /> text/html
                </span>
                <div className="flex h-full">
                    <pre
                        ref={gutterRef}
                        aria-hidden
                        className="font-mono select-none text-right text-secondary-600 bg-black/20 px-3 py-4 overflow-hidden shrink-0"
                        style={MONO_METRICS}
                    >{lineNumbers}</pre>
                    <div className="relative flex-1 overflow-hidden">
                        <pre
                            ref={preRef}
                            aria-hidden
                            className="font-mono absolute inset-0 m-0 px-4 py-4 overflow-auto whitespace-pre-wrap break-words text-slate-300 pointer-events-none"
                            style={MONO_METRICS}
                            dangerouslySetInnerHTML={{ __html: `${highlight(value)}\n` }}
                        />
                        <textarea
                            ref={setRefs}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            onScroll={syncScroll}
                            placeholder={placeholder}
                            spellCheck={false}
                            className="font-mono absolute inset-0 w-full h-full resize-none px-4 py-4 bg-transparent text-transparent caret-white placeholder:text-secondary-500 outline-none whitespace-pre-wrap break-words"
                            style={MONO_METRICS}
                        />
                    </div>
                </div>
            </div>
        );
    }
);

HtmlCodeEditor.displayName = 'HtmlCodeEditor';

export default HtmlCodeEditor;
