import React, { useState } from 'react';
import { Icon } from '../../components/Icon';

export function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3021/api'}/admin/import`,
        { method: 'POST', body: formData, credentials: 'include' }
      );
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setResult(data.data);
      } else {
        setStatus('error');
        setResult(data.error);
      }
    } catch (err) {
      setStatus('error');
      setResult('Upload failed. Please try again.');
    }
  };

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="file_upload" color="var(--usa-base-dark)" size={26} />
          Import Data
        </h1>
        <p className="usa-page-subtitle">Upload the Capacity Management Tracker Excel file</p>
      </div>

      <div className="detail-card">
        <h3>Upload Excel File</h3>
        <p style={{ marginBottom: 16, color: 'var(--usa-base-dark)' }}>
          Upload the "Digital Services - Capacity Management Tracker" Excel file to import resources and project assignments.
          The import will process both the Federal Resources and Contractor Resources sheets.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setStatus('idle'); }}
            className="usa-file-input"
          />
          <button
            className="usa-button usa-button--primary"
            onClick={handleUpload}
            disabled={!file || status === 'uploading'}
          >
            {status === 'uploading' ? (
              <><span className="usa-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Importing...</>
            ) : (
              <><Icon name="file_upload" color="white" size={16} /> Import</>
            )}
          </button>
        </div>

        {status === 'success' && result && (
          <div className="usa-alert usa-alert--success" style={{ marginTop: 16 }}>
            <strong>Import complete.</strong> {result.resourcesCreated} resources and {result.assignmentsCreated} assignments imported.
            {result.errors?.length > 0 && <span> ({result.errors.length} rows had errors)</span>}
          </div>
        )}

        {status === 'error' && (
          <div className="usa-alert usa-alert--error" style={{ marginTop: 16 }}>
            <strong>Import failed.</strong> {typeof result === 'string' ? result : 'Please check your file format.'}
          </div>
        )}
      </div>

      <div className="detail-card" style={{ marginTop: 16 }}>
        <h3>Expected Format</h3>
        <p>The Excel file should contain sheets named "Federal Resources" and "Contractor Resources" with columns matching the current tracker format.</p>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Division, Functional Area, Resource Name (Last, First)</li>
          <li>Primary Role, Secondary Role, Product, Project</li>
          <li>Project Status, Percent Utilized, Notes</li>
          <li>Federal: GS Level, Matrixed Resource</li>
          <li>Contractor: POP Start/End Dates</li>
        </ul>
      </div>
    </div>
  );
}
