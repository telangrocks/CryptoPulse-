// =============================================================================
// Component Mock Utilities - Production Ready
// =============================================================================
// Comprehensive mocking utilities for component testing

import React from 'react';
import { vi } from 'vitest';

// Mock component props
export interface MockComponentProps {
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
  onClick?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  onChange?: (value: any) => void;
  [key: string]: any;
}

// Mock component factory
export const createMockComponent = (
  displayName: string,
  defaultProps: MockComponentProps = {}
) => {
  const MockComponent: React.FC<MockComponentProps> = (props) => {
    const { children, ...rest } = props;
    return React.createElement(
      'div',
      {
        'data-testid': props['data-testid'] || displayName.toLowerCase(),
        ...defaultProps,
        ...rest
      },
      children
    );
  };

  MockComponent.displayName = displayName;
  return MockComponent;
};

// Common mock components
export const MockButton: React.FC<MockComponentProps> = createMockComponent('Button');
export const MockInput: React.FC<MockComponentProps> = createMockComponent('Input');
export const MockForm: React.FC<MockComponentProps> = createMockComponent('Form');
export const MockModal: React.FC<MockComponentProps> = createMockComponent('Modal');
export const MockCard: React.FC<MockComponentProps> = createMockComponent('Card');
export const MockTable: React.FC<MockComponentProps> = createMockComponent('Table');
export const MockDropdown: React.FC<MockComponentProps> = createMockComponent('Dropdown');
export const MockTooltip: React.FC<MockComponentProps> = createMockComponent('Tooltip');
export const MockSpinner: React.FC<MockComponentProps> = createMockComponent('Spinner');
export const MockAlert: React.FC<MockComponentProps> = createMockComponent('Alert');
export const MockBadge: React.FC<MockComponentProps> = createMockComponent('Badge');
export const MockAvatar: React.FC<MockComponentProps> = createMockComponent('Avatar');
export const MockIcon: React.FC<MockComponentProps> = createMockComponent('Icon');
export const MockProgress: React.FC<MockComponentProps> = createMockComponent('Progress');
export const MockTabs: React.FC<MockComponentProps> = createMockComponent('Tabs');
export const MockAccordion: React.FC<MockComponentProps> = createMockComponent('Accordion');
export const MockDialog: React.FC<MockComponentProps> = createMockComponent('Dialog');
export const MockDrawer: React.FC<MockComponentProps> = createMockComponent('Drawer');
export const MockPopover: React.FC<MockComponentProps> = createMockComponent('Popover');
export const MockMenu: React.FC<MockComponentProps> = createMockComponent('Menu');
export const MockNavbar: React.FC<MockComponentProps> = createMockComponent('Navbar');
export const MockSidebar: React.FC<MockComponentProps> = createMockComponent('Sidebar');
export const MockFooter: React.FC<MockComponentProps> = createMockComponent('Footer');

// Mock hooks
export const createMockHook = <T>(returnValue: T) => {
  return vi.fn(() => returnValue);
};

// Common mock hooks
export const mockUseState = <T>(initialValue: T) => {
  const state = { current: initialValue };
  const setState = vi.fn((newValue: T | ((prev: T) => T)) => {
    if (typeof newValue === 'function') {
      state.current = (newValue as (prev: T) => T)(state.current);
    } else {
      state.current = newValue;
    }
  });
  return [() => state.current, setState];
};

export const mockUseEffect = vi.fn();
export const mockUseCallback = vi.fn((callback) => callback);
export const mockUseMemo = vi.fn((factory) => factory());
export const mockUseRef = vi.fn((initialValue) => ({ current: initialValue }));
export const mockUseContext = vi.fn();
export const mockUseReducer = vi.fn();
export const mockUseLayoutEffect = vi.fn();

// Mock navigation hooks
export const mockUseNavigate = vi.fn();
export const mockUseLocation = vi.fn(() => ({
  pathname: '/',
  search: '',
  hash: '',
  state: null
}));
export const mockUseParams = vi.fn(() => ({}));
export const mockUseSearchParams = vi.fn(() => [new URLSearchParams(), vi.fn()]);

// Mock Redux hooks
export const mockUseSelector = vi.fn();
export const mockUseDispatch = vi.fn();

// Mock API hooks
export const mockUseQuery = vi.fn();
export const mockUseMutation = vi.fn();
export const mockUseSWR = vi.fn();

// Mock authentication hooks
export const mockUseAuth = vi.fn(() => ({
  user: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn()
}));

// Mock trading hooks
export const mockUseTrading = vi.fn(() => ({
  sessions: [],
  positions: [],
  marketData: {},
  isLoading: false,
  error: null,
  createSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  openPosition: vi.fn(),
  closePosition: vi.fn()
}));

// Mock theme hooks
export const mockUseTheme = vi.fn(() => ({
  theme: 'light',
  toggleTheme: vi.fn(),
  setTheme: vi.fn()
}));

// Mock toast hooks
export const mockUseToast = vi.fn(() => ({
  toast: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}));

// Mock error hooks
export const mockUseErrorHandler = vi.fn(() => ({
  handleError: vi.fn(),
  clearError: vi.fn(),
  error: null
}));

// Component mock setup
export const setupComponentMocks = () => {
  // Mock React hooks
  vi.mock('react', async () => {
    const actual = await vi.importActual('react');
    return {
      ...actual,
      useState: mockUseState,
      useEffect: mockUseEffect,
      useCallback: mockUseCallback,
      useMemo: mockUseMemo,
      useRef: mockUseRef,
      useContext: mockUseContext,
      useReducer: mockUseReducer,
      useLayoutEffect: mockUseLayoutEffect
    };
  });

  // Mock React Router
  vi.mock('react-router-dom', () => ({
    useNavigate: mockUseNavigate,
    useLocation: mockUseLocation,
    useParams: mockUseParams,
    useSearchParams: mockUseSearchParams,
    BrowserRouter: MockCard,
    Routes: MockCard,
    Route: MockCard,
    Link: MockButton,
    NavLink: MockButton,
    Navigate: MockCard
  }));

  // Mock Redux
  vi.mock('react-redux', () => ({
    useSelector: mockUseSelector,
    useDispatch: mockUseDispatch,
    Provider: MockCard,
    connect: vi.fn()
  }));

  // Mock custom hooks
  vi.mock('../../hooks/useAuth', () => ({
    useAuth: mockUseAuth
  }));

  vi.mock('../../hooks/useTrading', () => ({
    useTrading: mockUseTrading
  }));

  vi.mock('../../hooks/useTheme', () => ({
    useTheme: mockUseTheme
  }));

  vi.mock('../../hooks/useToast', () => ({
    useToast: mockUseToast
  }));

  vi.mock('../../hooks/useErrorHandler', () => ({
    useErrorHandler: mockUseErrorHandler
  }));

  // Mock UI components
  vi.mock('../../components/ui/Button', () => ({
    Button: MockButton
  }));

  vi.mock('../../components/ui/Input', () => ({
    Input: MockInput
  }));

  vi.mock('../../components/ui/Modal', () => ({
    Modal: MockModal
  }));

  vi.mock('../../components/ui/Card', () => ({
    Card: MockCard
  }));

  vi.mock('../../components/ui/Table', () => ({
    Table: MockTable
  }));

  vi.mock('../../components/ui/Dropdown', () => ({
    Dropdown: MockDropdown
  }));

  vi.mock('../../components/ui/Tooltip', () => ({
    Tooltip: MockTooltip
  }));

  vi.mock('../../components/ui/Spinner', () => ({
    Spinner: MockSpinner
  }));

  vi.mock('../../components/ui/Alert', () => ({
    Alert: MockAlert
  }));

  vi.mock('../../components/ui/Badge', () => ({
    Badge: MockBadge
  }));

  vi.mock('../../components/ui/Avatar', () => ({
    Avatar: MockAvatar
  }));

  vi.mock('../../components/ui/Icon', () => ({
    Icon: MockIcon
  }));

  vi.mock('../../components/ui/Progress', () => ({
    Progress: MockProgress
  }));

  vi.mock('../../components/ui/Tabs', () => ({
    Tabs: MockTabs
  }));

  vi.mock('../../components/ui/Accordion', () => ({
    Accordion: MockAccordion
  }));

  vi.mock('../../components/ui/Dialog', () => ({
    Dialog: MockDialog
  }));

  vi.mock('../../components/ui/Drawer', () => ({
    Drawer: MockDrawer
  }));

  vi.mock('../../components/ui/Popover', () => ({
    Popover: MockPopover
  }));

  vi.mock('../../components/ui/Menu', () => ({
    Menu: MockMenu
  }));

  vi.mock('../../components/ui/Navbar', () => ({
    Navbar: MockNavbar
  }));

  vi.mock('../../components/ui/Sidebar', () => ({
    Sidebar: MockSidebar
  }));

  vi.mock('../../components/ui/Footer', () => ({
    Footer: MockFooter
  }));
};

// Component test utilities
export const componentTestUtils = {
  // Create test wrapper
  createTestWrapper: (props: MockComponentProps = {}) => {
    const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <div data-testid="test-wrapper" {...props}>
        {children}
      </div>
    );
    return TestWrapper;
  },

  // Create mock event
  createMockEvent: (type: string = 'click') => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', {
      value: { value: 'test' },
      writable: false
    });
    return event;
  },

  // Create mock form event
  createMockFormEvent: (type: string = 'submit') => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'preventDefault', {
      value: vi.fn(),
      writable: false
    });
    Object.defineProperty(event, 'stopPropagation', {
      value: vi.fn(),
      writable: false
    });
    return event;
  },

  // Create mock change event
  createMockChangeEvent: (value: any = 'test') => {
    const event = new Event('change', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', {
      value: { value },
      writable: false
    });
    return event;
  },

  // Create mock keyboard event
  createMockKeyboardEvent: (key: string = 'Enter') => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'preventDefault', {
      value: vi.fn(),
      writable: false
    });
    return event;
  },

  // Create mock mouse event
  createMockMouseEvent: (type: string = 'click') => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'preventDefault', {
      value: vi.fn(),
      writable: false
    });
    return event;
  },

  // Create mock focus event
  createMockFocusEvent: (type: string = 'focus') => {
    const event = new FocusEvent(type, { bubbles: true, cancelable: true });
    return event;
  },

  // Create mock resize event
  createMockResizeEvent: () => {
    const event = new Event('resize', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', {
      value: window,
      writable: false
    });
    return event;
  },

  // Create mock scroll event
  createMockScrollEvent: () => {
    const event = new Event('scroll', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', {
      value: { scrollTop: 100, scrollLeft: 50 },
      writable: false
    });
    return event;
  }
};

// Mock component scenarios
export const componentScenarios = {
  // Basic component
  basic: () => ({
    children: 'Test Content',
    className: 'test-class',
    'data-testid': 'test-component'
  }),

  // Interactive component
  interactive: () => ({
    onClick: vi.fn(),
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    'data-testid': 'interactive-component'
  }),

  // Form component
  form: () => ({
    onSubmit: vi.fn(),
    children: (
      <form>
        <input type="text" placeholder="Test input" />
        <button type="submit">Submit</button>
      </form>
    )
  }),

  // Modal component
  modal: () => ({
    isOpen: true,
    onClose: vi.fn(),
    children: 'Modal Content'
  }),

  // Table component
  table: () => ({
    data: [
      { id: 1, name: 'Test 1' },
      { id: 2, name: 'Test 2' }
    ],
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Name' }
    ]
  }),

  // Loading component
  loading: () => ({
    isLoading: true,
    children: 'Loading...'
  }),

  // Error component
  error: () => ({
    error: new Error('Test error'),
    onRetry: vi.fn(),
    children: 'Error occurred'
  }),

  // Empty state component
  empty: () => ({
    isEmpty: true,
    message: 'No data available',
    children: 'Empty state'
  })
};

// Export everything
export default {
  createMockComponent,
  MockButton,
  MockInput,
  MockForm,
  MockModal,
  MockCard,
  MockTable,
  MockDropdown,
  MockTooltip,
  MockSpinner,
  MockAlert,
  MockBadge,
  MockAvatar,
  MockIcon,
  MockProgress,
  MockTabs,
  MockAccordion,
  MockDialog,
  MockDrawer,
  MockPopover,
  MockMenu,
  MockNavbar,
  MockSidebar,
  MockFooter,
  createMockHook,
  mockUseState,
  mockUseEffect,
  mockUseCallback,
  mockUseMemo,
  mockUseRef,
  mockUseContext,
  mockUseReducer,
  mockUseLayoutEffect,
  mockUseNavigate,
  mockUseLocation,
  mockUseParams,
  mockUseSearchParams,
  mockUseSelector,
  mockUseDispatch,
  mockUseQuery,
  mockUseMutation,
  mockUseSWR,
  mockUseAuth,
  mockUseTrading,
  mockUseTheme,
  mockUseToast,
  mockUseErrorHandler,
  setupComponentMocks,
  componentTestUtils,
  componentScenarios
};
