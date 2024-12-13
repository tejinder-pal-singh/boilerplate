import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { match, compile, pathToRegexp } from 'path-to-regexp';

type RouteParams = Record<string, string>;
type QueryParams = Record<string, string>;
type NavigateOptions = {
  replace?: boolean;
  state?: any;
  queryParams?: QueryParams;
};

interface Route {
  path: string;
  component: React.ComponentType<any>;
  guards?: RouteGuard[];
  layout?: React.ComponentType<any>;
  meta?: Record<string, any>;
  errorBoundary?: React.ComponentType<any>;
  loading?: React.ComponentType<any>;
  children?: Route[];
}

interface RouteMatch {
  params: RouteParams;
  query: QueryParams;
  path: string;
  route: Route;
}

interface RouterState {
  currentRoute: RouteMatch | null;
  previousRoute: RouteMatch | null;
  history: RouteMatch[];
  loading: boolean;
}

interface RouteGuard {
  canActivate: (
    to: RouteMatch,
    from: RouteMatch | null
  ) => boolean | Promise<boolean>;
  onReject?: (
    to: RouteMatch,
    from: RouteMatch | null
  ) => void | Promise<void>;
}

interface RouterContextType {
  state: RouterState;
  navigate: (path: string, options?: NavigateOptions) => Promise<void>;
  back: () => void;
  forward: () => void;
  replace: (path: string, options?: Omit<NavigateOptions, 'replace'>) => Promise<void>;
  match: (path: string) => RouteMatch | null;
  createUrl: (path: string, params?: RouteParams, query?: QueryParams) => string;
}

const RouterContext = createContext<RouterContextType | null>(null);

export function RouterProvider({
  children,
  routes,
  initialPath = '/',
  guards = [],
}: {
  children: React.ReactNode;
  routes: Route[];
  initialPath?: string;
  guards?: RouteGuard[];
}) {
  const [state, setState] = useState<RouterState>({
    currentRoute: null,
    previousRoute: null,
    history: [],
    loading: false,
  });

  const flattenedRoutes = useMemo(() => flattenRoutes(routes), [routes]);

  const parseQuery = (search: string): QueryParams => {
    const params = new URLSearchParams(search);
    const query: QueryParams = {};
    params.forEach((value, key) => {
      query[key] = value;
    });
    return query;
  };

  const createUrl = useCallback(
    (path: string, params: RouteParams = {}, query: QueryParams = {}) => {
      const toPath = compile(path);
      const queryString = new URLSearchParams(query).toString();
      return `${toPath(params)}${queryString ? `?${queryString}` : ''}`;
    },
    []
  );

  const matchRoute = useCallback(
    (path: string): RouteMatch | null => {
      const [pathname, search] = path.split('?');
      const query = parseQuery(search || '');

      for (const route of flattenedRoutes) {
        const matchFn = match(route.path);
        const result = matchFn(pathname);
        if (result) {
          return {
            params: result.params as RouteParams,
            query,
            path: pathname,
            route,
          };
        }
      }
      return null;
    },
    [flattenedRoutes]
  );

  const checkGuards = async (
    to: RouteMatch,
    from: RouteMatch | null
  ): Promise<boolean> => {
    const allGuards = [...guards, ...(to.route.guards || [])];
    for (const guard of allGuards) {
      const canActivate = await guard.canActivate(to, from);
      if (!canActivate) {
        guard.onReject?.(to, from);
        return false;
      }
    }
    return true;
  };

  const navigate = useCallback(
    async (
      path: string,
      { replace = false, state: navState = null, queryParams = {} }: NavigateOptions = {}
    ) => {
      const url = createUrl(path, {}, queryParams);
      const nextRoute = matchRoute(url);

      if (!nextRoute) {
        console.error(`No route found for path: ${path}`);
        return;
      }

      setState(prev => ({ ...prev, loading: true }));

      try {
        const canActivate = await checkGuards(nextRoute, state.currentRoute);
        if (!canActivate) return;

        setState(prev => {
          const newHistory = replace
            ? prev.history.slice(0, -1)
            : [...prev.history];
          newHistory.push(nextRoute);

          return {
            currentRoute: nextRoute,
            previousRoute: prev.currentRoute,
            history: newHistory,
            loading: false,
          };
        });

        window.history[replace ? 'replaceState' : 'pushState'](
          navState,
          '',
          url
        );
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    },
    [state.currentRoute, matchRoute, createUrl]
  );

  const replace = useCallback(
    (path: string, options: Omit<NavigateOptions, 'replace'> = {}) =>
      navigate(path, { ...options, replace: true }),
    [navigate]
  );

  const back = useCallback(() => {
    window.history.back();
  }, []);

  const forward = useCallback(() => {
    window.history.forward();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = matchRoute(window.location.pathname);
      if (nextRoute) {
        setState(prev => ({
          ...prev,
          currentRoute: nextRoute,
          previousRoute: prev.currentRoute,
        }));
      }
    };

    window.addEventListener('popstate', handlePopState);
    navigate(initialPath, { replace: true });

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [initialPath, navigate, matchRoute]);

  const value = useMemo(
    () => ({
      state,
      navigate,
      back,
      forward,
      replace,
      match: matchRoute,
      createUrl,
    }),
    [state, navigate, back, forward, replace, matchRoute, createUrl]
  );

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}

export function Route({
  path,
  component: Component,
  layout: Layout,
  errorBoundary: ErrorBoundary,
  loading: Loading,
}: Route) {
  const { state } = useRouter();
  const { currentRoute, loading } = state;

  if (loading && Loading) {
    return <Loading />;
  }

  if (!currentRoute || !pathToRegexp(path).test(currentRoute.path)) {
    return null;
  }

  const content = <Component {...currentRoute.params} />;

  if (ErrorBoundary) {
    return (
      <ErrorBoundary>
        {Layout ? <Layout>{content}</Layout> : content}
      </ErrorBoundary>
    );
  }

  return Layout ? <Layout>{content}</Layout> : content;
}

export function Link({
  to,
  children,
  className,
  activeClassName,
  replace: shouldReplace,
  state,
  ...props
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  replace?: boolean;
  state?: any;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const { navigate, state: routerState } = useRouter();
  const isActive = routerState.currentRoute?.path === to;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(to, { replace: shouldReplace, state });
  };

  return (
    <a
      href={to}
      className={`${className || ''} ${
        isActive && activeClassName ? activeClassName : ''
      }`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  );
}

function flattenRoutes(routes: Route[], parentPath = ''): Route[] {
  return routes.reduce<Route[]>((acc, route) => {
    const path = `${parentPath}${route.path}`;
    const flatRoute = { ...route, path };
    return [
      ...acc,
      flatRoute,
      ...(route.children ? flattenRoutes(route.children, path) : []),
    ];
  }, []);
}

export type { Route, RouteGuard, RouteMatch, RouteParams, QueryParams, NavigateOptions };

// Example usage:
// const routes: Route[] = [
//   {
//     path: '/',
//     component: Home,
//     guards: [authGuard],
//     layout: MainLayout,
//     meta: { title: 'Home' },
//   },
//   {
//     path: '/users/:id',
//     component: UserProfile,
//     errorBoundary: ErrorFallback,
//     loading: LoadingSpinner,
//   },
// ];
//
// function App() {
//   return (
//     <RouterProvider routes={routes} initialPath="/">
//       <nav>
//         <Link to="/" activeClassName="active">Home</Link>
//         <Link to="/users/123">User Profile</Link>
//       </nav>
//       {routes.map(route => (
//         <Route key={route.path} {...route} />
//       ))}
//     </RouterProvider>
//   );
// }
