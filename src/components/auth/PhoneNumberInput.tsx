import React, { useState, useRef, useEffect, useMemo } from 'react';

type Country = { code: string; name?: string; dial: string; flag?: string };

interface PhoneNumberInputProps {
  countries: Country[];
  selected: { code: string; dial: string };
  onSelect: (country: Country) => void;
  phone: string;
  onChangePhone: (value: string) => void;
  placeholder?: string;
  inputId?: string;
}

// カスタム電話番号入力 UI（見た目は指定UIに合わせ、挙動はReact制御）
export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  countries,
  selected,
  onSelect,
  phone,
  onChangePhone,
  placeholder = '00 1234 5678',
  inputId = 'phonenumber',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectedCountry = countries.find(c => c.code === selected.code) || {
    code: selected.code,
    dial: selected.dial,
    flag: '',
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => {
      const name = (c.name ?? c.code).toLowerCase();
      const code = c.code.toLowerCase();
      const dial = c.dial.toLowerCase();
      return name.includes(q) || code.includes(q) || dial.includes(q);
    });
  }, [countries, query]);

  return (
    <div className="bnx-phone" ref={wrapperRef}>
      <div className={`ui-wrapper ${open ? 'is-open' : ''}`}>
        {/* Dropdown trigger */}
        <button
          type="button"
          className="dropdown-container"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flag" aria-hidden>
            {selectedCountry.flag ?? ''}
          </span>
        </button>

        {/* Phone input */}
        <div className="input-wrapper">
          <legend className="sr-only">Phone number</legend>
          <div className="textfield">
            <span className="dial-prefix">{selectedCountry.dial}</span>
            <input
              id={inputId}
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => onChangePhone(e.target.value)}
              placeholder={placeholder}
            />
          </div>
          <span className="invalid-msg">Invalid phone number</span>
        </div>

        {/* Dropdown list with search */}
        <div className={`select-wrapper ${open ? 'open' : ''}`}>
          <div className="group country-search">
            <svg className="search-icon" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              className="input"
              type="text"
              placeholder="Search country..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search country"
            />
          </div>
          <ul role="listbox" aria-label="Select country">
            {filtered.map((c) => (
              <li
                key={c.code}
                className={`country-item ${c.code === selected.code ? 'active' : ''}`}
                role="option"
                aria-selected={c.code === selected.code}
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <label>
                  <span className="mr-2">{c.flag ?? ''}</span>
                  {c.name ?? c.code}
                  <span className="ml-2 text-gray-500">{c.dial}</span>
                </label>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="country-item" aria-disabled>
                <label>No results</label>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PhoneNumberInput;
