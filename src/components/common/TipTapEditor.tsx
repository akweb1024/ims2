'use client';

import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import {
    Bold, Italic, Underline, Strikethrough, List, ListOrdered,
    AlignLeft, AlignCenter, AlignRight, AlignJustify, Link2, Heading2, Heading3,
    Table as TableIcon, Rows3, Columns3, Trash2,
} from 'lucide-react';

export interface RichEditorHandle {
    /** Insert text (e.g. a {{shortcode}}) at the caret. */
    insert: (text: string) => void;
}

interface TipTapEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

function Btn({ onClick, active, disabled, title, children }: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
    return (
        <button
            type="button"
            title={title}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`p-1.5 rounded-md transition-colors disabled:opacity-30 ${active ? 'bg-primary-100 text-primary-700' : 'text-secondary-500 hover:bg-secondary-100'}`}
        >
            {children}
        </button>
    );
}

function Toolbar({ editor }: { editor: Editor }) {
    const inTable = editor.isActive('table');
    return (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-secondary-200 bg-secondary-50 p-1.5 rounded-t-xl">
            <select
                value={editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : 'p'}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'p') editor.chain().focus().setParagraph().run();
                    else editor.chain().focus().toggleHeading({ level: Number(v) as 2 | 3 }).run();
                }}
                className="text-xs font-bold bg-white border border-secondary-200 rounded-md px-1.5 py-1 mr-1"
            >
                <option value="p">Body</option>
                <option value="2">Heading</option>
                <option value="3">Subheading</option>
            </select>
            <Btn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></Btn>
            <Btn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></Btn>
            <Btn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={15} /></Btn>
            <Btn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></Btn>
            <span className="w-px h-5 bg-secondary-200 mx-1" />
            <Btn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={15} /></Btn>
            <Btn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={15} /></Btn>
            <Btn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={15} /></Btn>
            <Btn title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={15} /></Btn>
            <span className="w-px h-5 bg-secondary-200 mx-1" />
            <Btn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></Btn>
            <Btn title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></Btn>
            <Btn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></Btn>
            <Btn title="Subheading" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></Btn>
            <Btn
                title="Link"
                active={editor.isActive('link')}
                onClick={() => {
                    if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return; }
                    const url = window.prompt('Link URL');
                    if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
            ><Link2 size={15} /></Btn>
            <span className="w-px h-5 bg-secondary-200 mx-1" />
            {/* Table controls */}
            <Btn title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={15} /></Btn>
            <Btn title="Add row below" disabled={!inTable} onClick={() => editor.chain().focus().addRowAfter().run()}><Rows3 size={15} /></Btn>
            <Btn title="Add column right" disabled={!inTable} onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns3 size={15} /></Btn>
            <Btn title="Delete row" disabled={!inTable} onClick={() => editor.chain().focus().deleteRow().run()}><span className="text-[11px] font-black">−R</span></Btn>
            <Btn title="Delete column" disabled={!inTable} onClick={() => editor.chain().focus().deleteColumn().run()}><span className="text-[11px] font-black">−C</span></Btn>
            <Btn title="Delete table" disabled={!inTable} onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 size={15} /></Btn>
        </div>
    );
}

const TipTapEditor = forwardRef<RichEditorHandle, TipTapEditorProps>(({ value, onChange, className }, ref) => {
    const editor = useEditor({
        immediatelyRender: false, // avoid Next SSR hydration mismatch
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: value || '',
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    useImperativeHandle(ref, () => ({
        insert: (text: string) => { editor?.chain().focus().insertContent(text).run(); },
    }), [editor]);

    // Sync external value changes (preset load, HTML-mode edits) into the editor without
    // clobbering the caret while the user is typing (value === current HTML → skip).
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '', { emitUpdate: false });
        }
    }, [value, editor]);

    if (!editor) {
        return <div className="h-52 bg-secondary-50 animate-pulse rounded-xl border border-secondary-200" />;
    }

    return (
        <div className={`tiptap-editor rounded-xl border border-secondary-200 bg-white ${className || ''}`}>
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
            <style jsx global>{`
                .tiptap-editor .ProseMirror { min-height: 300px; max-height: 520px; overflow-y: auto; padding: 16px; outline: none; font-size: 0.875rem; line-height: 1.6; }
                .tiptap-editor .ProseMirror:focus { outline: none; }
                .tiptap-editor .ProseMirror h2 { font-size: 1.15rem; font-weight: 800; margin: 0.6em 0 0.3em; }
                .tiptap-editor .ProseMirror h3 { font-size: 1rem; font-weight: 700; margin: 0.5em 0 0.25em; }
                .tiptap-editor .ProseMirror p { margin: 0.35em 0; }
                .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 1.4em; margin: 0.35em 0; }
                .tiptap-editor .tableWrapper { overflow-x: auto; margin: 0.6em 0; }
                .tiptap-editor .ProseMirror table { border-collapse: collapse; width: 100%; table-layout: fixed; }
                .tiptap-editor .ProseMirror td, .tiptap-editor .ProseMirror th { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; position: relative; min-width: 48px; }
                .tiptap-editor .ProseMirror th { background: #f1f5f9; font-weight: 700; text-align: left; }
                .tiptap-editor .ProseMirror .selectedCell:after { content: ''; position: absolute; inset: 0; background: rgba(59,130,246,0.12); pointer-events: none; }
                .tiptap-editor .ProseMirror .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background: #3b82f6; cursor: col-resize; }
                .tiptap-editor .ProseMirror.resize-cursor { cursor: col-resize; }
            `}</style>
        </div>
    );
});

TipTapEditor.displayName = 'TipTapEditor';

export default TipTapEditor;
