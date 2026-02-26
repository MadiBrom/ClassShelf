export default function ManualEntryForm({ manualForm, setManualForm, onSubmit }) {
  return (
    <form className="manual" onSubmit={onSubmit}>
      <h3>Manual Entry</h3>

      <div className="manual__grid">
        <input
          type="text"
          placeholder="Title *"
          value={manualForm.title}
          onChange={(event) => setManualForm((prev) => ({ ...prev, title: event.target.value }))}
          required
        />

        <input
          type="text"
          placeholder="Authors (comma separated)"
          value={manualForm.authors}
          onChange={(event) => setManualForm((prev) => ({ ...prev, authors: event.target.value }))}
        />

        <input
          type="url"
          placeholder="Cover URL"
          value={manualForm.coverUrl}
          onChange={(event) => setManualForm((prev) => ({ ...prev, coverUrl: event.target.value }))}
        />

        <input
          type="text"
          placeholder="Genre"
          value={manualForm.genre}
          onChange={(event) => setManualForm((prev) => ({ ...prev, genre: event.target.value }))}
        />

        <input
          type="text"
          placeholder="Reading level"
          value={manualForm.readingLevel}
          onChange={(event) =>
            setManualForm((prev) => ({ ...prev, readingLevel: event.target.value }))
          }
        />

        <input
          type="text"
          placeholder="Interest"
          value={manualForm.interest}
          onChange={(event) => setManualForm((prev) => ({ ...prev, interest: event.target.value }))}
        />

        <textarea
          placeholder="Description"
          value={manualForm.description}
          onChange={(event) =>
            setManualForm((prev) => ({ ...prev, description: event.target.value }))
          }
        />
      </div>

      <button type="submit">Add & Save</button>
    </form>
  );
}
