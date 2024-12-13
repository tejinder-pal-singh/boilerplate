import Link from 'next/link';
import { UserNav } from './user-nav';
import { MainNav } from './main-nav';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <MainNav />
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-2">
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}