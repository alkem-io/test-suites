/*
 * Filter controls for the per-release view.
 *
 * Any .metric-tile that carries data-filter-kind + data-filter-value becomes
 * a clickable toggle. Clicking it hides rows in table.cases whose
 * matching data-<kind> attribute does not equal the filter value. Clicking
 * an active tile again clears the filter. Only one filter is active at a
 * time — keeping the interaction model simple and predictable.
 *
 * No framework; vanilla DOM APIs; safe to include on pages without any
 * filterable tiles (no-op in that case).
 */

(function () {
  const tiles = document.querySelectorAll('.metric-tile[data-filter-kind]');
  if (tiles.length === 0) return;
  const table = document.querySelector('table.cases');
  if (!table) return;
  const rows = table.querySelectorAll('tbody tr');

  let activeKind = null;
  let activeValue = null;

  function normalize(val) {
    return (val || '').toLowerCase();
  }

  function apply() {
    let visibleCount = 0;
    rows.forEach(function (r) {
      let match = true;
      if (activeKind) {
        const rowValue = normalize(r.dataset[activeKind]);
        match = rowValue === normalize(activeValue);
      }
      r.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    tiles.forEach(function (t) {
      const isActive =
        t.dataset.filterKind === activeKind &&
        t.dataset.filterValue === activeValue;
      t.classList.toggle('filter-active', !!(activeKind && isActive));
    });

    const status = document.getElementById('filter-status');
    if (status) {
      if (!activeKind) {
        status.textContent = '';
      } else {
        status.textContent =
          'Filtered: ' + activeKind + ' = ' + activeValue +
          ' (' + visibleCount + ' of ' + rows.length + ' case' + (rows.length === 1 ? '' : 's') + ')';
      }
    }
  }

  tiles.forEach(function (t) {
    t.setAttribute('role', 'button');
    t.setAttribute('tabindex', '0');
    t.addEventListener('click', function () {
      const kind = t.dataset.filterKind;
      const value = t.dataset.filterValue;
      if (activeKind === kind && activeValue === value) {
        activeKind = null;
        activeValue = null;
      } else {
        activeKind = kind;
        activeValue = value;
      }
      apply();
    });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        t.click();
      }
    });
  });
})();
