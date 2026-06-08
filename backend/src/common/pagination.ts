// Shape of a paginated API response.
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
