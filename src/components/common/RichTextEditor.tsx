'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Wrap ReactQuill so a ref reaches the underlying editor through next/dynamic
// (dynamic() otherwise swallows the ref, so getEditor() would be unavailable).
const ReactQuill = dynamic(
    async () => {
        const { default: RQ } = await import('react-quill-new');
        const Wrapped = ({ forwardedRef, ...props }: any) => <RQ ref={forwardedRef} {...props} />;
        Wrapped.displayName = 'ReactQuillWrapped';
        return Wrapped;
    },
    {
        ssr: false,
        loading: () => <div className="h-40 bg-secondary-50 animate-pulse rounded-xl border border-secondary-200"></div>,
    }
);

export interface RichTextEditorHandle {
    /** Insert text (e.g. a {{shortcode}}) at the caret, or append if the editor isn't ready. */
    insert: (text: string) => void;
}

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
    ({ value, onChange, placeholder, className }, ref) => {
        const quillRef = useRef<any>(null);

        useImperativeHandle(ref, () => ({
            insert: (text: string) => {
                const editor = quillRef.current?.getEditor?.();
                if (!editor) { onChange(`${value || ''} ${text}`); return; }
                const range = editor.getSelection(true);
                const index = range ? range.index : editor.getLength();
                editor.insertText(index, text, 'user');
                editor.setSelection(index + text.length, 0);
            },
        }));

        const modules = {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                ['link'],
                ['clean']
            ],
        };

        const formats = [
            'header',
            'bold', 'italic', 'underline', 'strike',
            'align', 'list', 'indent', 'link',
        ];

        return (
            <div className={`rich-text-editor-container ${className || ''}`}>
                <ReactQuill
                    forwardedRef={quillRef}
                    theme="snow"
                    value={value}
                    onChange={onChange}
                    modules={modules}
                    formats={formats}
                    placeholder={placeholder}
                />
                <style jsx global>{`
                    .rich-text-editor-container .ql-container {
                        border-bottom-left-radius: 12px;
                        border-bottom-right-radius: 12px;
                        min-height: 150px;
                        font-family: inherit;
                        font-size: 0.875rem;
                    }
                    .rich-text-editor-container .ql-toolbar {
                        border-top-left-radius: 12px;
                        border-top-right-radius: 12px;
                        background: #f8fafc;
                        border-color: #e2e8f0;
                    }
                    .rich-text-editor-container .ql-container.ql-snow {
                        border-color: #e2e8f0;
                    }
                    .rich-text-editor-container .ql-editor {
                        min-height: 150px;
                    }
                `}</style>
            </div>
        );
    }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
