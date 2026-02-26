import ManualEntryForm from "./ManualEntryForm.jsx";

export default function SearchAddPanel({
  searchQuery,
  setSearchQuery,
  searchResults,
  searchSource,
  copiesDraft,
  setCopiesDraft,
  onSearch,
  onAddFromSearch,
  manualForm,
  setManualForm,
  onManualAdd,
}) {
  return (
    <section className="panel">
      <h2>Search + Add</h2>

      <form className="search" onSubmit={onSearch}>
        <input
          type="search"
          placeholder="Search by title or author..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <div className="grid">
        {searchResults.map((result) => (
          <article key={result.id} className="card">
            <div className="card__cover">
              {result.coverUrl ? (
                <img src={result.coverUrl} alt={result.title} />
              ) : (
                <div className="cover__placeholder">No cover</div>
              )}
            </div>

            <div className="card__body">
              <h3>{result.title}</h3>
              <p>{(result.authors || []).join(", ")}</p>
              <p className="subtle">{result.description}</p>

              <div className="card__meta">
                <span className="tag">{result.source === "catalog" ? "Catalog" : "Google"}</span>
              </div>

              <div className="card__actions">
                <input
                  type="number"
                  min="1"
                  value={copiesDraft[result.id] || 1}
                  onChange={(event) => {
                    setCopiesDraft((prev) => ({ ...prev, [result.id]: event.target.value }));
                  }}
                />
                <button type="button" onClick={() => onAddFromSearch(result)}>
                  Add to shelf
                </button>
              </div>
            </div>
          </article>
        ))}

        {!searchResults.length && (
          <div className="empty">
            {searchSource === "catalog" ? (
              <p>Search to find books in your catalog or Google Books.</p>
            ) : (
              <ManualEntryForm
                manualForm={manualForm}
                setManualForm={setManualForm}
                onSubmit={onManualAdd}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
