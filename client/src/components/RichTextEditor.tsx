import React, { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 96 }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value && !isInternalChange.current && ref.current) {
      ref.current.innerHTML = value || '';
    }
    prevValue.current = value;
    isInternalChange.current = false;
  }, [value]);

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
  }

  function handleLink() {
    const url = window.prompt('Enter URL:');
    if (url === null) return;
    if (url) exec('createLink', url);
    else exec('unlink');
  }

  return (
    <div className="rte-wrapper">
      <div className="rte-toolbar" role="toolbar" aria-label="Text formatting">
        <button
          type="button"
          className="rte-btn"
          onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}
          aria-label="Bold"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="rte-btn"
          onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }}
          aria-label="Bullet list"
          title="Bullet list"
        >
          ≡
        </button>
        <button
          type="button"
          className="rte-btn"
          onMouseDown={(e) => { e.preventDefault(); handleLink(); }}
          aria-label="Insert link"
          title="Insert link"
        >
          🔗
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="rte-content"
        style={{ minHeight }}
        data-placeholder={placeholder || ''}
        onInput={() => {
          isInternalChange.current = true;
          onChange(ref.current?.innerHTML || '');
        }}
      />
    </div>
  );
}

export function RichTextDisplay({ html, className }: { html: string; className?: string }) {
  if (!html) return null;
  // eslint-disable-next-line react/no-danger
  return (
    <div
      className={`rte-display${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
