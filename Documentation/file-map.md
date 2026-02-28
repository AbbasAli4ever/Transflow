# File Map — src/

One line per file. For pattern code snippets see `component-patterns.md`.

---

## src/app/

```
app/layout.tsx                                   Root layout — providers, fonts, metadata
app/not-found.tsx                                Global 404 page

app/(admin)/layout.tsx                           Admin shell — AppSidebar + AppHeader + Backdrop
app/(admin)/page.tsx                             Dashboard home (ecommerce metrics, charts)

app/(admin)/(others-pages)/blank/page.tsx        Empty template page

app/(admin)/(others-pages)/supplier/page.tsx              Supplier list — search, filter, sort, drawer CRUD
app/(admin)/(others-pages)/supplier/detail/page.tsx       Supplier detail page shell
app/(admin)/(others-pages)/supplier/detail/SupplierDetailShell.tsx   Suspense boundary for supplier detail
app/(admin)/(others-pages)/supplier/detail/SupplierDetailClient.tsx  Supplier detail — balance cards, 3-tab (Ledger/Open Docs/Transactions)

app/(admin)/(others-pages)/customer/page.tsx              Customer list — search, filter, sort, drawer CRUD
app/(admin)/(others-pages)/customer/detail/page.tsx       Customer detail shell
app/(admin)/(others-pages)/customer/detail/CustomerDetailShell.tsx   Suspense boundary for customer detail
app/(admin)/(others-pages)/customer/detail/CustomerDetailClient.tsx  Customer detail — balance cards, tabs

app/(admin)/(others-pages)/products/page.tsx              Product list — search, filter, sort, drawer CRUD
app/(admin)/(others-pages)/products/detail/page.tsx       Product detail shell
app/(admin)/(others-pages)/products/detail/ProductDetailShell.tsx    Suspense boundary for product detail
app/(admin)/(others-pages)/products/detail/ProductDetailClient.tsx   Product detail — stock cards, variants table, 3-tab (Movements/Purchases/Sales)

app/(admin)/(others-pages)/payment-accounts/page.tsx               Payment accounts list
app/(admin)/(others-pages)/payment-accounts/detail/page.tsx        Payment account detail shell
app/(admin)/(others-pages)/payment-accounts/detail/PaymentAccountDetailShell.tsx  Suspense boundary
app/(admin)/(others-pages)/payment-accounts/detail/PaymentAccountDetailClient.tsx Payment account detail — balance, statement

app/(admin)/(ui-elements)/alerts/page.tsx        Alert components showcase
app/(admin)/(ui-elements)/avatars/page.tsx       Avatar components showcase
app/(admin)/(ui-elements)/badge/page.tsx         Badge components showcase
app/(admin)/(ui-elements)/buttons/page.tsx       Button components showcase
app/(admin)/(ui-elements)/images/page.tsx        Image grid showcase
app/(admin)/(ui-elements)/modals/page.tsx        Modal examples
app/(admin)/(ui-elements)/videos/page.tsx        Video embed examples
app/(admin)/(forms)/form-elements/page.tsx       Form elements showcase
app/(admin)/(chart)/bar-chart/page.tsx           Bar chart page
app/(admin)/(chart)/line-chart/page.tsx          Line chart page
app/(admin)/(tables)/basic-tables/page.tsx       Table examples

app/(full-width-pages)/layout.tsx                Full-width layout (no sidebar)
app/(full-width-pages)/(auth)/layout.tsx         Auth layout
app/(full-width-pages)/(auth)/signin/page.tsx    Login page
app/(full-width-pages)/(auth)/signup/page.tsx    Registration page
app/(full-width-pages)/(error-pages)/error-404/page.tsx  404 error page
```

---

## src/components/

```
components/ui/badge/Badge.tsx                    Status badges — variant="light|solid", color="success|warning|error|primary|info|light|dark"
components/ui/button/Button.tsx                  Primary button — variant="outline|filled", size="sm|md", startIcon, endIcon
components/ui/modal/index.tsx                    Modal dialog — isOpen, onClose, Escape key, body overflow lock, z-99999
components/ui/table/index.tsx                    Table structural components (Table, TableHeader, TableBody, etc.)
components/ui/alert/Alert.tsx                    Alert box (error/success variants)
components/ui/avatar/Avatar.tsx                  Image avatar with fallback initials
components/ui/avatar/AvatarText.tsx              Text-only avatar
components/ui/dropdown/Dropdown.tsx              Dropdown wrapper with click-outside
components/ui/dropdown/DropdownItem.tsx          Dropdown menu item

components/tables/BasicTableOne.tsx              Sample data table with badges
components/tables/Pagination.tsx                 Reusable pagination controls (prev/next/page numbers)

components/auth/AuthGuard.tsx                    Protects routes — redirects unauthenticated users
components/auth/SignInForm.tsx                   Login form (email + password, JWT storage)
components/auth/SignUpForm.tsx                   Registration form

components/form/Form.tsx                         Form wrapper
components/form/Label.tsx                        Form label
components/form/Select.tsx                       Select dropdown
components/form/MultiSelect.tsx                  Multi-select dropdown
components/form/date-picker.tsx                  Date picker (flatpickr)
components/form/switch/Switch.tsx                Toggle switch
components/form/input/InputField.tsx             Text input field
components/form/input/Checkbox.tsx               Checkbox
components/form/input/Radio.tsx                  Radio button
components/form/input/FileInput.tsx              File upload input
components/form/input/TextArea.tsx               Textarea

components/header/NotificationDropdown.tsx       Header notification menu
components/header/UserDropdown.tsx               Header user profile menu

components/common/ChartTab.tsx                   Tab switcher for charts
components/common/ComponentCard.tsx              Card wrapper for UI showcase
components/common/PageBreadCrumb.tsx             Breadcrumb navigation
components/common/ThemeToggleButton.tsx          Dark/light mode toggle

components/charts/bar/BarChartOne.tsx            Bar chart (ApexCharts)
components/charts/line/LineChartOne.tsx          Line chart (ApexCharts)

components/ecommerce/EcommerceMetrics.tsx        KPI metrics cards
components/ecommerce/MonthlySalesChart.tsx       Sales trend chart
components/ecommerce/RecentOrders.tsx            Recent orders list
components/ecommerce/StatisticsChart.tsx         Statistics visualization
components/ecommerce/MonthlyTarget.tsx           Target vs actual gauge
components/ecommerce/DemographicCard.tsx         Demographics display
components/ecommerce/CountryMap.tsx              Geographic map

components/calendar/Calendar.tsx                 Calendar widget
components/user-profile/UserInfoCard.tsx         User info display card
components/user-profile/UserMetaCard.tsx         User metadata card
components/user-profile/UserAddressCard.tsx      Address display card
```

---

## src/layout/

```
layout/AppSidebar.tsx      Main navigation sidebar (links to all business pages)
layout/AppHeader.tsx       Top header bar (theme toggle, notifications, user menu)
layout/SidebarWidget.tsx   Sidebar bottom widget
layout/Backdrop.tsx        Full-screen backdrop overlay for mobile sidebar
```

---

## src/context/

```
context/AuthContext.tsx    User auth state — login(), logout(), user object, token management
context/ThemeContext.tsx   Dark/light theme — toggles class on <html>, persists to localStorage
context/SidebarContext.tsx Sidebar open/closed state — isExpanded, isMobileOpen, toggleMobileSidebar
```

---

## src/hooks/

```
hooks/useModal.ts    Modal state — isOpen, openModal, closeModal, toggleModal
hooks/useGoBack.ts   Navigate back — uses router.back() with fallback to href
```

---

## src/lib/

```
lib/api.ts               Base HTTP client — apiRequest<T>(path, options)
                         Handles 401 → refresh → retry. Exports ApiError type.
lib/suppliers.ts         Supplier + Transaction API — see CLAUDE.md for full export list
lib/customers.ts         Customer API — see CLAUDE.md for full export list
lib/products.ts          Product + Variant + Stock API — see CLAUDE.md for full export list
lib/paymentAccounts.ts   Payment Account API — see CLAUDE.md for full export list
```
