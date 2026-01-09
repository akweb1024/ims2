'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-40 bg-secondary-50 animate-pulse rounded-xl border border-secondary-200"></div>,
});

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className }) => {
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list',
    ];

    return (
        <div className={`rich-text-editor-container ${className}`}>
            <ReactQuill
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
};

export default RichTextEditor;
