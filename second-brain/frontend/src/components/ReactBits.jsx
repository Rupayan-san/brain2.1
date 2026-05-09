export function BitButton({
  children,
  icon: Icon,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button className={`bit-button bit-button-${variant} ${className}`} {...props}>
      {Icon ? <Icon size={17} strokeWidth={2} /> : null}
      <span>{children}</span>
    </button>
  );
}

export function BitIconButton({ label, icon: Icon, className = "", ...props }) {
  return (
    <button className={`bit-icon-button ${className}`} aria-label={label} title={label} {...props}>
      <Icon size={18} strokeWidth={2} />
    </button>
  );
}

export function BitCard({ children, className = "" }) {
  return <article className={`bit-card ${className}`}>{children}</article>;
}

export function BitPanel({ children, className = "" }) {
  return <section className={`bit-panel ${className}`}>{children}</section>;
}

export function BitPageHeader({ eyebrow, title, action }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </header>
  );
}

export function BitMetric({ label, value, detail, tone = "neutral" }) {
  return (
    <div className={`bit-metric bit-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function BitChip({ children, active = false, icon: Icon, className = "", ...props }) {
  return (
    <button className={`bit-chip ${active ? "is-active" : ""} ${className}`} {...props}>
      {Icon ? <Icon size={14} /> : null}
      <span>{children}</span>
    </button>
  );
}

export function BitStatus({ children, tone = "neutral" }) {
  return <span className={`bit-status bit-status-${tone}`}>{children}</span>;
}

export function BitInput({ icon: Icon, className = "", ...props }) {
  return (
    <label className={`bit-input ${className}`}>
      {Icon ? <Icon size={17} /> : null}
      <input {...props} />
    </label>
  );
}

export function BitTextarea({ className = "", ...props }) {
  return <textarea className={`bit-textarea ${className}`} {...props} />;
}

export function BitToggleGroup({ options, value, onChange }) {
  return (
    <div className="bit-toggle-group">
      {options.map((option) => (
        <button
          key={option.value}
          className={option.value === value ? "is-active" : ""}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function BitTable({ columns, rows, emptyText = "No records yet." }) {
  return (
    <div className="bit-table-wrap">
      <table className="bit-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyText}</td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={row.id ?? row._id ?? rowIndex}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function BitFeedItem({ icon: Icon, title, meta, children }) {
  return (
    <div className="bit-feed-item">
      <div className="feed-icon">{Icon ? <Icon size={16} /> : null}</div>
      <div>
        <div className="feed-title-row">
          <strong>{title}</strong>
          {meta ? <span>{meta}</span> : null}
        </div>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}

export function BitEmptyState({ title, children }) {
  return (
    <div className="bit-empty">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
