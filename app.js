const App = () => {
  const [films, setFilms] = React.useState(FILMS);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [genre, setGenre] = React.useState('');
  const [selected, setSelected] = React.useState(null);

  const genres = [...new Set(films.flatMap(f => f.genre ? f.genre.split(',').map(g => g.trim()) : []))].sort();

  const filtered = films.filter(f => {
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && 
        !f.director?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'watched' && !f.watched) return false;
    if (filter === 'unwatched' && f.watched) return false;
    if (genre && !f.genre?.toLowerCase().includes(genre.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.year - a.year);

  const stats = { total: films.length, watched: films.filter(f => f.watched).length };

  const toggleWatch = (id, e) => {
    if (e) e.stopPropagation();
    setFilms(films.map(f => f.id === id ? {...f, watched: !f.watched} : f));
    if (selected?.id === id) setSelected({...selected, watched: !selected.watched});
  };

  return (
    <div>
      <header className="header">
        <div className="header-top">
          <div className="logo">Ciné<span>mathèque</span></div>
          <div className="stats"><b>{stats.total}</b> films · <b>{stats.watched}</b> vus</div>
        </div>
        <div className="controls">
          <input 
            className="search-box" 
            placeholder="Rechercher..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tous</button>
          <button className={`filter-btn ${filter === 'unwatched' ? 'active' : ''}`} onClick={() => setFilter('unwatched')}>À voir</button>
          <button className={`filter-btn ${filter === 'watched' ? 'active' : ''}`} onClick={() => setFilter('watched')}>Vus</button>
          <select value={genre} onChange={e => setGenre(e.target.value)}>
            <option value="">Genre</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </header>

      <main className="main">
        <div className="count">{filtered.length} films</div>
        {filtered.length > 0 ? (
          <div className="grid">
            {filtered.map(f => (
              <div key={f.id} className="card" onClick={() => setSelected(f)}>
                {f.poster ? (
                  <>
                    <img className="card-img" src={f.poster} alt={f.title} />
                    <div className="card-info">
                      <div className="card-title">{f.title}</div>
                      <div className="card-year">{f.year}</div>
                    </div>
                  </>
                ) : (
                  <div className="card-noimg">
                    <div className="card-title">{f.title}</div>
                    <div className="card-year">{f.year}</div>
                  </div>
                )}
                <div 
                  className={`watch-btn ${f.watched ? 'watched' : ''}`} 
                  onClick={e => toggleWatch(f.id, e)}
                >✓</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">Aucun film trouvé</div>
        )}
      </main>

      {selected && (
        <div className="modal-bg" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{selected.title}</div>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-meta">
                {selected.director} · {selected.year} {selected.country && `· ${selected.country}`}
              </div>
              {selected.genre && (
                <div className="modal-section">
                  <h4>Genre</h4>
                  <div>{selected.genre.split(',').map(g => <span key={g} className="tag">{g.trim()}</span>)}</div>
                </div>
              )}
              {selected.actors && (
                <div className="modal-section">
                  <h4>Casting</h4>
                  <p>{selected.actors}</p>
                </div>
              )}
              {selected.source && (
                <div className="modal-section">
                  <h4>Source</h4>
                  <p>{selected.source}</p>
                </div>
              )}
              <button 
                className={`btn ${selected.watched ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleWatch(selected.id)}
                style={{width: '100%', marginTop: '0.5rem'}}
              >
                {selected.watched ? '✓ Vu' : 'Marquer comme vu'}
              </button>
            </div>
            <div className="modal-actions">
              <a className="btn btn-secondary" href={`https://www.imdb.com/find?q=${encodeURIComponent(selected.title)}`} target="_blank">IMDb</a>
              <a className="btn btn-primary" href={`https://www.justwatch.com/fr/recherche?q=${encodeURIComponent(selected.title)}`} target="_blank">Où regarder</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
