import React from "react";
import PropTypes from 'prop-types';
import {Provider as ReduxProvider, useDispatch, useSelector} from 'react-redux';
import {useRouter} from 'next/router';
import initRedux from "../src/modules/redux/initRedux";
import {StylesProvider, jssPreset} from '@material-ui/styles';
import PageContext from "../src/modules/components/PageContext";
import {ThemeProvider} from "../src/modules/components/ThemeContext";
import {create} from 'jss';
import rtl from 'jss-rtl';
import pages from "../src/pages";
import find from 'lodash/find';
import loadScript from "../src/modules/utils/loadScript";
import acceptLanguage from 'accept-language';
import {ACTION_TYPES, CODE_VARIANTS} from "../src/modules/constants";
import {getCookie} from "../src/modules/utils/helpers";
import {loadCSS} from 'fg-loadcss/src/loadCSS';

const jss = create({
  plugins: [...jssPreset().plugins, rtl()],
  insertionPoint: process.browser ? document.querySelector('#insertion-point-jss') : null,
});

function useFirstRender() {
  const firstRenderRef = React.useRef(true);
  React.useEffect(() => {
    firstRenderRef.current = false;
  }, []);

  return firstRenderRef.current;
}

acceptLanguage.languages(['en', 'zh', 'pt']);

function loadCrowdin() {
  window._jipt = [];
  window._jipt.push(['project', 'material-ui-docs']);
  loadScript('https://cdn.crowdin.com/jipt/jipt.js', document.querySelector('head'));
}

function usePersistCodeVariant() {
  const dispatch = useDispatch();
  const {codeVariant: initialCodeVariant = CODE_VARIANTS.JS} = useSelector(
    (state) => state.options,
  );

  const isFirstRender = useFirstRender();

  const navigatedCodeVariant = React.useMemo(() => {
    const navigatedCodeVariantMatch =
      typeof window !== 'undefined' ? window.location.hash.match(/\.(js|tsx)$/) : null;

    if (navigatedCodeVariantMatch === null) {
      return undefined;
    }

    return navigatedCodeVariantMatch[1] === 'tsx' ? CODE_VARIANTS.TS : CODE_VARIANTS.JS;
  }, []);

  const persistedCodeVariant = React.useMemo(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    return getCookie('codeVariant');
  }, []);

  /**
   * we initialize from navigation or cookies. on subsequent renders the store is the
   * truth
   */
  const codeVariant =
    isFirstRender === true
      ? navigatedCodeVariant || persistedCodeVariant || initialCodeVariant
      : initialCodeVariant;

  React.useEffect(() => {
    if (codeVariant !== initialCodeVariant) {
      dispatch({type: ACTION_TYPES.OPTIONS_CHANGE, payload: {codeVariant}});
    }
  });

  React.useEffect(() => {
    document.cookie = `codeVariant=${codeVariant};path=/;max-age=31536000`;
  }, [codeVariant]);

  return codeVariant;
}

async function registerServiceWorker() {
  if (
    'serviceWorker' in navigator &&
    process.env.NODE_ENV === 'production' &&
    window.location.host.indexOf('material-ui.com') <= 0
  ) {
    // register() automatically attempts to refresh the sw.js.
    const registration = await navigator.serviceWorker.register('/sw.js');
    // Force the page reload for users.
    forcePageReload(registration);
  }
}

function forcePageReload(registration) {

  if (!navigator.serviceWorker.controller) {
    return;
  }

  if (registration.waiting) {
    registration.waiting.postMessage('skipWaiting');
    return;
  }

  function listenInstalledStateChange() {
    registration.installing.addEventListener('statechange', (event) => {
      if (event.target.state === 'installed' && registration.waiting) {
        registration.waiting.postMessage('skipWaiting');
      } else if (event.target.state === 'activated') {
        window.location.reload();
      }
    });
  }

  if (registration.installing) {
    listenInstalledStateChange();
    return;
  }

  registration.addEventListener('updatefound', listenInstalledStateChange);
}

let dependenciesLoaded = false;

function loadDependencies() {
  if (dependenciesLoaded) {
    return;
  }

  dependenciesLoaded = true;

  loadCSS(
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    document.querySelector('#material-icon-font'),
  );
}

function findActivePage(currentPages, pathname) {
  const activePage = find(currentPages, (page) => {
    if (page.children) {
      if (pathname.indexOf(`${page.pathname}/`) === 0) {
        // Check if one of the children matches (for /components)
        return findActivePage(page.children, pathname);
      }
    }

    // Should be an exact match if no children
    return pathname === page.pathname;
  });

  if (!activePage) {
    return null;
  }

  // We need to drill down
  if (activePage.pathname !== pathname) {
    return findActivePage(activePage.children, pathname);
  }

  return activePage;
}

function AppWrapper(props) {
  const {children, pageProps} = props;

  const router = useRouter();

  // console.log(pageProps);
  const [redux] = React.useState(() =>
    initRedux({options: {userLanguage: pageProps.userLanguage}}),
  );

  console.log(router);
  let pathname = router.pathname;

  console.log(pathname);

  React.useEffect(() => {
    loadDependencies();
    registerServiceWorker();

    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
  }, []);

  // Add support for leading / in development mode.
  if (pathname !== '/') {
    // The leading / is only added to support static hosting (resolve /index.html).
    // We remove it to normalize the pathname.
    // See `rewriteUrlForNextExport` on Next.js side.
    pathname = pathname.replace(/\/$/, '');
  }

  const activePage = findActivePage(pages, pathname);
  console.log(activePage);
  return (
    <React.Fragment>
      {/*<NextHead>*/}
      {/*  {fonts.map((font) => (*/}
      {/*    <link rel="stylesheet" href={font} key={font} />*/}
      {/*  ))}*/}
      {/*</NextHead>*/}

      <ReduxProvider store={redux}>
        <PageContext.Provider value={{activePage, pages, versions: pageProps.versions}}>
          <StylesProvider jss={jss}>
            <ThemeProvider>{children}</ThemeProvider>
          </StylesProvider>
        </PageContext.Provider>
        {/*<LanguageNegotiation />*/}
        {/*<Analytics />*/}
      </ReduxProvider>
      {/*<GoogleAnalytics key={router.route}/>*/}
    </React.Fragment>
  )
}

AppWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  pageProps: PropTypes.object.isRequired,
};

export default function MyApp(props) {
  const {Component, pageProps} = props;
  console.log(props.sponsorsProps);
  // console.log(pageProps.sponsorsProps.docs.location);
  // console.log(pageProps.sponsorsProps);

  return (
    <AppWrapper pageProps={pageProps}>
      <Component {...pageProps} />
    </AppWrapper>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired,
};
MyApp.getInitialProps = async ({ctx, Component}) => {
  let pageProps = {};

  if (Component.getInitialProps) {
    pageProps = await Component.getInitialProps(ctx);
  }

  return {
    pageProps: {
      userLanguage: ctx.query.userLanguage || 'en',
      ...pageProps,
    },
  };
};
