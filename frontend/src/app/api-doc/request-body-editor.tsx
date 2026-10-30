'use client';

import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ComponentType } from 'react';

interface TextAreaProps {
  className: string;
  title: string;
  value: string | undefined;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

interface RequestBodyEditorProps {
  onChange?: (value: unknown) => void;
  getComponent: (name: string) => ComponentType<TextAreaProps>;
  value?: unknown;
  defaultValue?: string;
  errors: {
    size: number;
    join: (separator: string) => string;
  };
}

function stringify(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (value !== null && typeof value === 'object' && 'toJS' in value && typeof value.toJS === 'function') {
    value = value.toJS();
  }

  if (value !== null && typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  if (value === null || value === undefined) {
    return '';
  }

  return value.toString();
}

export function RequestBodyEditor({
  onChange = () => {},
  getComponent,
  value,
  defaultValue,
  errors,
}: RequestBodyEditorProps) {
  const [editorValue, setEditorValue] = useState<string | undefined>(() => stringify(value) || defaultValue);
  const previousPropsRef = useRef({ value, defaultValue });
  const initialValueRef = useRef(value);
  const initialOnChangeRef = useRef(onChange);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = event.target.value;
    setEditorValue(inputValue);
    onChange(stringify(inputValue));
  }, [onChange]);

  useEffect(() => {
    initialOnChangeRef.current(initialValueRef.current);
  }, []);

  useEffect(() => {
    const previousProps = previousPropsRef.current;

    if (previousProps.value !== value && value !== editorValue) {
      setEditorValue(stringify(value));
    }

    if (!value && defaultValue && editorValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditorValue(defaultValue);
      onChangeRef.current(defaultValue);
    }

    previousPropsRef.current = { value, defaultValue };
  }, [value, defaultValue, editorValue]);

  return (
    <div className="body-param">
      {createElement(getComponent('TextArea'), {
        className: `body-param__text${errors.size > 0 ? ' invalid' : ''}`,
        title: errors.size > 0 ? errors.join(', ') : '',
        value: editorValue,
        onChange: handleChange,
      })}
    </div>
  );
}

export const requestBodyEditorPlugin = () => ({
  components: {
    RequestBodyEditor,
  },
});
