import React, { useEffect, useState } from 'react';
import { BookOpenText, Upload, FileText, Save } from 'lucide-react';
import { createKnowledgeNote, fetchKnowledgeDocuments, uploadKnowledgeDocument } from '../services/api';

export default function KnowledgeView() {
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetchKnowledgeDocuments();
      setDocuments(response.documents || []);
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Failed to load knowledge documents.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleSaveNote = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      await createKnowledgeNote({
        title,
        content,
        tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setTitle('');
      setContent('');
      setTags('');
      setFeedback({ type: 'success', message: 'Knowledge note saved for coach retrieval.' });
      await loadDocuments();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Failed to save note.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      const formData = new FormData();
      formData.append('document', file);
      if (title.trim()) formData.append('title', title.trim());
      if (tags.trim()) formData.append('tags', tags.trim());
      await uploadKnowledgeDocument(formData);
      setFile(null);
      setTitle('');
      setTags('');
      setFeedback({ type: 'success', message: 'Document uploaded and chunked successfully.' });
      await loadDocuments();
    } catch (error) {
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Failed to upload document.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-space animate-fadeIn">
      <div className="glass-panel scanner-hero">
        <div className="scanner-hero-inner">
          <div className="scanner-icon" style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}>
            <BookOpenText size={24} />
          </div>
          <div>
            <h2 className="page-title">Knowledge & Semantic Context</h2>
            <p className="text-sm text-muted">Upload recipes, coaching notes, or diet plans so the coach can reference them in future chats.</p>
          </div>
        </div>
      </div>

      <div className="knowledge-layout">
        <section className="glass-panel knowledge-form-card">
          <h3 className="section-title">Add knowledge note</h3>
          <form onSubmit={handleSaveNote} className="profile-form-grid">
            <label className="form-group profile-form-full"><span>Title</span><input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label className="form-group profile-form-full"><span>Tags</span><input className="form-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="recipe, dinner, protein" /></label>
            <label className="form-group profile-form-full"><span>Content</span><textarea className="form-textarea" rows="7" value={content} onChange={(e) => setContent(e.target.value)} /></label>
            <div className="profile-actions profile-form-full"><button className="btn btn-primary" type="submit" disabled={isSaving || !title.trim() || !content.trim()}><Save size={15} /> {isSaving ? 'Saving...' : 'Save Note'}</button></div>
          </form>

          <div className="knowledge-upload-block">
            <h3 className="section-title">Upload text document</h3>
            <input type="file" className="form-input" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button className="btn btn-secondary" type="button" onClick={handleUpload} disabled={isSaving || !file}><Upload size={15} /> Upload Document</button>
          </div>

          {feedback.message ? <div className={`info-box ${feedback.type === 'error' ? 'info-box-error' : 'info-box-success'}`}>{feedback.message}</div> : null}
        </section>

        <section className="glass-panel knowledge-list-card">
          <div className="card-header-row">
            <div className="card-header-left">
              <FileText size={18} style={{ color: 'var(--primary-light)' }} />
              <span className="section-title">Saved documents</span>
            </div>
          </div>
          {isLoading ? <div className="text-sm text-muted">Loading knowledge documents...</div> : null}
          <div className="knowledge-doc-list">
            {documents.map((doc) => (
              <article key={doc.id} className="knowledge-doc-card">
                <div className="knowledge-doc-top">
                  <strong>{doc.title}</strong>
                  <span className="badge badge-blue">{doc.doc_type || 'note'}</span>
                </div>
                <div className="text-sm text-muted">{doc.source_name || 'Manual entry'} • {(doc.chunks || []).length} chunks</div>
                <div className="text-sm text-muted">{(doc.tags || []).join(', ') || 'No tags'}</div>
              </article>
            ))}
            {!isLoading && documents.length === 0 ? <div className="text-sm text-muted">No knowledge documents yet.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}