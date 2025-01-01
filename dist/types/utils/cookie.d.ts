declare function setCookie(name: string, value: string, days: number): void;
declare function getCookie(name: string): string | null;
declare function deleteCookie(name: string): void;

export { deleteCookie, getCookie, setCookie };
