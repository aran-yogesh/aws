import React, { useState } from 'react';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Placeholder for extracted info display
  // Integration with backend will be added later

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Integration with backend will go here
    setTimeout(() => {
      setExtracted('Sample extracted information will appear here.');
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="info-page">
      <h1 className="title">AI Copilot for Senior Citizens</h1>
      <form className="info-form" onSubmit={handleSubmit}>
        <label htmlFor="user-instructions" className="form-label">
          Enter your instructions or questions:
        </label>
        <textarea
          id="user-instructions"
          className="input-area"
          value={input}
          onChange={handleInputChange}
          placeholder="Type your request here..."
          rows={5}
          required
        />
        <label htmlFor="file-upload" className="form-label">
          Or upload a medical document (PDF, image):
        </label>
        <input
          id="file-upload"
          className="file-input"
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileChange}
        />
        <button className="submit-btn" type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Extract Information'}
        </button>
      </form>
      <div className="extracted-section">
        <h2>Extracted Information</h2>
        <div className="extracted-box">
          {extracted || 'No information extracted yet.'}
        </div>
      </div>
    </div>
  );
}

export default App;
