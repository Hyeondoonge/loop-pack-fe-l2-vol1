// 뒤로·앞으로만 이 파일에 둔다. 테스트 어댑터는 history·location을 건드리지 않아 세션 히스토리가
// 없고, jsdom window는 파일 단위로 공유돼 히스토리 스택이 다음 테스트로 샌다(결정 6 2차 개정).
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithBrowserHistory } from '@/test/lib/render';
import ProductListSection from './ProductListSection';

// nuqs 기본 throttle이 jsdom에서 50ms다. 연속 조작이 이보다 빠르면 하나의 pushState로 합쳐져
// 히스토리 엔트리가 쌓이지 않는다.
const URL_UPDATE_THROTTLE_MS = 50;

function waitForHistoryEntry() {
  return new Promise((resolve) => setTimeout(resolve, URL_UPDATE_THROTTLE_MS + 10));
}

describe('뒤로 가기와 앞으로 가기', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/products');
  });

  it('필터를 두 번 바꾼 뒤 뒤로 가면 직전 조건의 화면과 주소로 돌아오고, 앞으로 가면 최신 조건으로 돌아온다', async () => {
    renderWithBrowserHistory(<ProductListSection />);
    await screen.findByRole('heading', { name: '오버핏 블레이저' });

    await userEvent.selectOptions(screen.getByLabelText('카테고리'), 'casual');
    await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' });
    await waitFor(() => expect(screen.queryByRole('heading', { name: '오버핏 블레이저' })).not.toBeInTheDocument());
    await waitForHistoryEntry();

    await userEvent.selectOptions(screen.getByLabelText('정렬'), 'price-desc');
    await waitFor(() => expect(screen.getByLabelText('정렬')).toHaveValue('price-desc'));
    await waitForHistoryEntry();

    window.history.back();

    // jsdom의 히스토리 이동은 비동기라 동기 단언이 안 된다.
    await waitFor(() => expect(screen.getByLabelText('정렬')).toHaveValue('latest'));
    expect(screen.getByLabelText('카테고리')).toHaveValue('casual');
    // 정렬을 바꾸기 전 주소에는 sort 키가 없었다. 기본값으로 돌아왔다는 것이 곧 키가 없는 상태다.
    expect(new URLSearchParams(window.location.search).get('category')).toBe('casual');
    expect(new URLSearchParams(window.location.search).get('sort')).toBeNull();
    expect(await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' })).toBeVisible();

    window.history.forward();

    await waitFor(() => expect(screen.getByLabelText('정렬')).toHaveValue('price-desc'));
    expect(screen.getByLabelText('카테고리')).toHaveValue('casual');
    expect(new URLSearchParams(window.location.search).get('sort')).toBe('price-desc');
  });
});
