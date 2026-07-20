'use client';

import { useState, type FormEvent } from 'react';

interface SearchInputProps {
  defaultValue: string;
  onSubmit: (value: string) => void;
}

export default function SearchInput({ defaultValue, onSubmit }: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        검색
        <input name="q" placeholder="상품명 또는 브랜드" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <button type="submit">검색</button>
    </form>
  );
}
