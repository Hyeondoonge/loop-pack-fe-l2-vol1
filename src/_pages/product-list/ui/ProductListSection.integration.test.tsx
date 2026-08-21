import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { server } from '../../../../mocks/node';
import { renderWithProviders } from '../../../../test/render';
import { PRODUCT_LIST_ENDPOINT } from '../mock/handlers';
import { PRODUCT_LIST_STUBS } from '../mock/products';
import ProductListSection from './ProductListSection';
import { Header } from '@/widgets/header';

function getResultsRegion() {
  return screen.getByRole('region', { name: '상품 검색 결과' });
}

describe('목록 상태', () => {
  it('최초 진입에는 결과 영역이 로딩 중임을 알리고, 응답이 오면 상품이 보인다', async () => {
    renderWithProviders(<ProductListSection />);

    expect(getResultsRegion()).toHaveAttribute('aria-busy', 'true');

    expect(await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' })).toBeVisible();
    expect(getResultsRegion()).toHaveAttribute('aria-busy', 'false');
  });

  it('결과가 비어 있으면 안내 문구를 보여준다', async () => {
    server.use(http.get(PRODUCT_LIST_ENDPOINT, () => HttpResponse.json(PRODUCT_LIST_STUBS.empty)));
    renderWithProviders(<ProductListSection />);

    expect(await screen.findByText('검색 결과가 없습니다.')).toBeVisible();
  });

  it('결과가 하나뿐이면 안내 문구가 아니라 상품 카드 한 장을 보여준다', async () => {
    server.use(http.get(PRODUCT_LIST_ENDPOINT, () => HttpResponse.json(PRODUCT_LIST_STUBS.single)));
    renderWithProviders(<ProductListSection />);

    expect(await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' })).toBeVisible();
    expect(screen.queryByText('검색 결과가 없습니다.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('빈 결과는 에러 화면으로 새지 않고 필터도 그대로 조작할 수 있다', async () => {
    server.use(http.get(PRODUCT_LIST_ENDPOINT, () => HttpResponse.json(PRODUCT_LIST_STUBS.empty)));
    renderWithProviders(<ProductListSection />);

    await screen.findByText('검색 결과가 없습니다.');

    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '필터 초기화' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('카테고리')).toBeEnabled();
  });

  it('서버 오류면 오류 문구와 다시 시도 버튼을 보여준다', async () => {
    server.use(http.get(PRODUCT_LIST_ENDPOINT, () => HttpResponse.json({ message: '상품을 불러오지 못했습니다.' }, { status: 500 })));
    renderWithProviders(<ProductListSection />);

    expect(await screen.findByText('상품을 불러오지 못했습니다.')).toBeVisible();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeVisible();
  });

  it('잘못된 요청이면 다시 시도가 아니라 필터 초기화를 보여준다', async () => {
    server.use(http.get(PRODUCT_LIST_ENDPOINT, () => HttpResponse.json({ message: '잘못된 요청입니다.' }, { status: 400 })));
    renderWithProviders(<ProductListSection />);

    expect(await screen.findByRole('button', { name: '필터 초기화' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
  });

  it('오류 화면에서 다시 시도를 누르면 목록이 복구된다', async () => {
    server.use(http.get(PRODUCT_LIST_ENDPOINT, () => HttpResponse.json({ message: '상품을 불러오지 못했습니다.' }, { status: 500 })));
    renderWithProviders(<ProductListSection />);

    const retryButton = await screen.findByRole('button', { name: '다시 시도' });

    server.use(http.get(PRODUCT_LIST_ENDPOINT, () => HttpResponse.json(PRODUCT_LIST_STUBS.default)));
    await userEvent.click(retryButton);

    expect(await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' })).toBeVisible();
  });

  it('다시 시도를 누르면 결과 영역이 다시 로딩 상태가 되어 같은 버튼을 두 번 누를 수 없다', async () => {
    server.use(http.get(PRODUCT_LIST_ENDPOINT, () => HttpResponse.json({ message: '상품을 불러오지 못했습니다.' }, { status: 500 })));
    renderWithProviders(<ProductListSection />);

    const retryButton = await screen.findByRole('button', { name: '다시 시도' });

    server.use(
      http.get(PRODUCT_LIST_ENDPOINT, async () => {
        await delay(200);
        return HttpResponse.json(PRODUCT_LIST_STUBS.default);
      })
    );
    await userEvent.click(retryButton);

    // 데이터가 없는 에러 쿼리를 다시 부르면 react-query가 상태를 pending으로 되돌린다.
    // 버튼이 비활성으로 남는 것이 아니라 로딩 화면으로 교체되어 중복 요청 자체가 불가능해진다.
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
    expect(getResultsRegion()).toHaveAttribute('aria-busy', 'true');

    expect(await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' })).toBeVisible();
  });
});

// 화면에 그려진 카드에서 가격만 뽑는다. 정렬 항목은 특정 상품이 아니라 출력의 성질을 본다(결정 9).
function getVisiblePrices() {
  return screen.getAllByRole('article').map((card) => {
    const priceText = within(card).getByText(/원$/).textContent ?? '';
    return Number(priceText.replace(/[^0-9]/g, ''));
  });
}

describe('필터 조작', () => {
  it('카테고리를 고르면 그 카테고리 상품만 남고, 전체로 되돌리면 다시 나타난다', async () => {
    renderWithProviders(<ProductListSection />);
    await screen.findByRole('heading', { name: '오버핏 블레이저' });

    await userEvent.selectOptions(screen.getByLabelText('카테고리'), 'casual');

    await waitFor(() => expect(screen.queryByRole('heading', { name: '오버핏 블레이저' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: '데일리 코튼 티셔츠' })).toBeVisible();

    await userEvent.selectOptions(screen.getByLabelText('카테고리'), 'all');

    expect(await screen.findByRole('heading', { name: '오버핏 블레이저' })).toBeVisible();
  });

  it('가격 낮은순을 고르면 화면 가격이 오름차순이고, 높은순으로 바꾸면 뒤집힌다', async () => {
    renderWithProviders(<ProductListSection />);
    await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' });
    const initialPrices = getVisiblePrices();

    await userEvent.selectOptions(screen.getByLabelText('정렬'), 'price-asc');
    await waitFor(() => expect(getVisiblePrices()).not.toEqual(initialPrices));

    const ascendingPrices = getVisiblePrices();
    // 카드가 한 장뿐이면 어떤 정렬이든 통과하므로 개수 하한을 함께 본다.
    expect(ascendingPrices.length).toBeGreaterThan(1);
    expect([...ascendingPrices].sort((left, right) => left - right)).toEqual(ascendingPrices);

    await userEvent.selectOptions(screen.getByLabelText('정렬'), 'price-desc');
    await waitFor(() => expect(getVisiblePrices()).not.toEqual(ascendingPrices));

    const descendingPrices = getVisiblePrices();
    expect(descendingPrices.length).toBeGreaterThan(1);
    expect([...descendingPrices].sort((left, right) => right - left)).toEqual(descendingPrices);
  });

  it('다음을 누르면 첫 페이지 상품이 사라지고 페이지 표시가 바뀐다', async () => {
    renderWithProviders(<ProductListSection />);
    await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' });
    expect(screen.getByText('1 / 2')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: '데일리 코튼 티셔츠' })).not.toBeInTheDocument());
    expect(screen.getByText('2 / 2')).toBeVisible();
  });

  it('첫 페이지에서는 이전을, 마지막 페이지에서는 다음을 누를 수 없다', async () => {
    renderWithProviders(<ProductListSection />);
    await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' });

    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByText('2 / 2');

    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '이전' })).toBeEnabled();
  });

  it('필터를 바꿔 다시 불러오는 동안에는 이전 조건의 목록이 화면에 남는다', async () => {
    renderWithProviders(<ProductListSection />);
    await screen.findByRole('heading', { name: '오버핏 블레이저' });

    server.use(
      http.get(PRODUCT_LIST_ENDPOINT, async () => {
        await delay(200);
        return HttpResponse.json(PRODUCT_LIST_STUBS.casual);
      })
    );
    await userEvent.selectOptions(screen.getByLabelText('카테고리'), 'casual');

    // 새 결과가 오기 전 순간. 목록을 스켈레톤으로 갈아끼우지 않고 이전 결과를 남긴 채 갱신 중임만 알린다.
    expect(screen.getByRole('heading', { name: '오버핏 블레이저' })).toBeVisible();
    expect(getResultsRegion()).toHaveAttribute('aria-busy', 'true');

    // 새 결과가 도착하면 이전 조건의 상품이 사라진다. 코튼 티셔츠는 두 조건에 모두 있어 판별에 못 쓴다.
    await waitFor(() => expect(screen.queryByRole('heading', { name: '오버핏 블레이저' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: '데일리 코튼 티셔츠' })).toBeVisible();
  });

  it('페이지를 넘긴 뒤 필터를 바꾸면 첫 페이지로 돌아간다', async () => {
    renderWithProviders(<ProductListSection />);
    await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' });

    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByText('2 / 2');

    await userEvent.selectOptions(screen.getByLabelText('카테고리'), 'casual');

    // 2페이지 조건으로 요청했다면 스텁에 없는 조건이라 에러 화면이 된다. 목록이 보이는 것 자체가
    // 첫 페이지로 리셋됐다는 뜻이고, 페이지 표시로 한 번 더 확인한다.
    expect(await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' })).toBeVisible();
    expect(screen.getByText('1 / 1')).toBeVisible();
  });
});

describe('URL 반영과 재진입', () => {
  it('카테고리를 바꾸면 그 조건이 URL에 실린다', async () => {
    const handleUrlUpdate = vi.fn();
    renderWithProviders(<ProductListSection />, { onUrlUpdate: handleUrlUpdate });
    await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' });

    await userEvent.selectOptions(screen.getByLabelText('카테고리'), 'casual');

    await waitFor(() => expect(handleUrlUpdate).toHaveBeenCalled());
    const lastUpdate = handleUrlUpdate.mock.calls.at(-1)?.[0];
    expect(lastUpdate?.searchParams.get('category')).toBe('casual');
  });

  it('페이지를 넘길 때는 page만 바뀌고 기존 조건이 유지된다', async () => {
    const handleUrlUpdate = vi.fn();
    renderWithProviders(<ProductListSection />, { searchParams: '?sort=price-asc', onUrlUpdate: handleUrlUpdate });
    await screen.findByRole('heading', { name: '우드 디퓨저' });

    await userEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => expect(handleUrlUpdate).toHaveBeenCalled());
    const lastUpdate = handleUrlUpdate.mock.calls.at(-1)?.[0];
    expect(lastUpdate?.searchParams.get('page')).toBe('2');
    expect(lastUpdate?.searchParams.get('sort')).toBe('price-asc');
  });

  it('조건이 담긴 주소로 처음 들어와도 표시값과 목록이 그 조건과 맞는다', async () => {
    renderWithProviders(<ProductListSection />, { searchParams: '?category=casual&sort=price-desc' });

    expect(await screen.findByRole('heading', { name: '워시드 데님 팬츠' })).toBeVisible();
    expect(screen.getByLabelText('카테고리')).toHaveValue('casual');
    expect(screen.getByLabelText('정렬')).toHaveValue('price-desc');
    expect(screen.queryByRole('heading', { name: '오버핏 블레이저' })).not.toBeInTheDocument();
    expect(getVisiblePrices()).toEqual([59_000, 29_000]);
  });

  it('주소의 정렬 값이 알 수 없는 값이면 기본 정렬로 들어온다', async () => {
    renderWithProviders(<ProductListSection />, { searchParams: '?sort=존재하지않는정렬' });

    expect(await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' })).toBeVisible();
    expect(screen.getByLabelText('정렬')).toHaveValue('latest');
  });

  it('주소의 페이지가 0이면 첫 페이지로 들어온다', async () => {
    renderWithProviders(<ProductListSection />, { searchParams: '?page=0' });

    expect(await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' })).toBeVisible();
    expect(screen.getByText('1 / 2')).toBeVisible();
  });
});

describe('담기와 헤더 개수', () => {
  function renderListWithHeader() {
    return renderWithProviders(
      <>
        <Header />
        <ProductListSection />
      </>
    );
  }

  it('상품을 담으면 헤더 장바구니 개수가 늘고, 다시 누르면 되돌아간다', async () => {
    renderListWithHeader();
    await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' });
    expect(screen.getByText('장바구니 0')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: '데일리 코튼 티셔츠 장바구니' }));
    expect(screen.getByText('장바구니 1')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: '데일리 코튼 티셔츠 장바구니' }));
    expect(screen.getByText('장바구니 0')).toBeVisible();
  });

  it('담기 전에는 담기지 않은 상태로, 담은 뒤에는 담긴 상태로 표시된다', async () => {
    renderListWithHeader();
    await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' });

    const cartButton = screen.getByRole('button', { name: '데일리 코튼 티셔츠 장바구니' });
    expect(cartButton).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(cartButton);

    expect(cartButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('서로 다른 상품을 담으면 개수가 쌓인다', async () => {
    renderListWithHeader();
    await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' });

    await userEvent.click(screen.getByRole('button', { name: '데일리 코튼 티셔츠 장바구니' }));
    await userEvent.click(screen.getByRole('button', { name: '오버핏 블레이저 장바구니' }));

    expect(screen.getByText('장바구니 2')).toBeVisible();
  });

  it('위시리스트와 장바구니 개수는 서로 섞이지 않는다', async () => {
    renderListWithHeader();
    await screen.findByRole('heading', { name: '데일리 코튼 티셔츠' });

    await userEvent.click(screen.getByRole('button', { name: '데일리 코튼 티셔츠 위시리스트' }));

    expect(screen.getByText('위시리스트 1')).toBeVisible();
    expect(screen.getByText('장바구니 0')).toBeVisible();
  });
});
