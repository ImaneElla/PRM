'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { requestBodyEditorPlugin } from './request-body-editor';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocPage() {
  return (
    <div style={{ background: 'white', minHeight: '100vh' }}>
      <SwaggerUI url="/openapi.json" plugins={[requestBodyEditorPlugin]} />
    </div>
  );
}