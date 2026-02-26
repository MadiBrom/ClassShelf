export default function LibraryHeader({
  isTeacher,
  shelfCodePretty,
  shelfCode,
  copied,
  isRefreshingCode,
  onCopyCode,
  onRefreshCode,
}) {
  return (
    <header className="library__header">
      <div>
        <h1>{isTeacher ? "Teacher Library" : "Student Library"}</h1>

        {isTeacher && (
          <div className="subtle">
            <div>
              Class code: <strong>{shelfCodePretty || "Not set yet"}</strong>
            </div>
            <div className="row__actions">
              <button type="button" onClick={onCopyCode} disabled={!shelfCode}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={onRefreshCode} disabled={isRefreshingCode}>
                {isRefreshingCode ? "Generating..." : "Generate new code"}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
