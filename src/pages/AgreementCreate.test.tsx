import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCollaborationAgreement } from '@/lib/agreements-api';
import { addCalendarYears, formatAgreementDate, localIsoDate } from '@/lib/agreements-model';
import { baseTranslations, translateMessage } from '@/lib/i18n';
import AgreementCreate from '@/pages/AgreementCreate';

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', full_name: 'Alex Rivera', username: 'alex' },
  }),
}));

vi.mock('@/lib/agreements-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/agreements-api')>('@/lib/agreements-api');
  return {
    ...actual,
    searchAgreementParties: async () => [],
    createCollaborationAgreement: vi.fn(async () => 'agr-1'),
  };
});

describe('AgreementCreate', () => {
  beforeEach(() => {
    vi.mocked(createCollaborationAgreement).mockClear();
  });
  it('prefills related activity and parties inside the agreement document', () => {
    render(
      <MemoryRouter
        initialEntries={['/agreements/new?from=opportunity&relatedId=opp-1&relatedTitle=Campus%20pilot&partyName=Cedar%20River%20University']}
      >
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement on');
    expect(screen.getByTestId('agreement-party-reference')).toHaveTextContent('CRU');
    expect(screen.queryByTestId('agreement-civizen-reference')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Contribution');
    expect(screen.getAllByText('Campus pilot').length).toBeGreaterThan(0);
    expect(screen.getByTestId('agreement-token-purpose')).toHaveTextContent('Campus pilot');
    const organization = screen.getByTestId('agreement-token-party_a');
    const contributor = screen.getByTestId('agreement-token-party_b');
    expect(organization).toHaveTextContent('Cedar River University');
    expect(contributor).toHaveTextContent('Alex Rivera');
    expect(organization).toHaveAttribute('contenteditable', 'true');
    expect(organization.className.split(/\s+/)).toContain('inline!');
    expect(organization.className.split(/\s+/)).not.toContain('inline-grid');
    expect(organization.className.split(/\s+/)).toContain('wrap-break-word');
    expect(screen.getByTestId('agreement-document')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organization / Project role' })).toHaveTextContent('Organization / Project');
    expect(screen.getByRole('button', { name: 'Contributor role' })).toHaveTextContent('Contributor');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Other party')).not.toBeInTheDocument();
    expect(screen.queryByText('Is this a person or an organization?')).not.toBeInTheDocument();
  });

  it('opens the list-page type menu from Agreement on and switches the document', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <Routes>
          <Route path="/agreements/new" element={<AgreementCreate />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Agreement on' }));
    expect(screen.getByRole('menuitem', { name: 'Employment Agreement' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Service / Contribution' })).toBeInTheDocument();
    expect(screen.getByTestId('agreements-more-types')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Employment Agreement' }));
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Employment');
    expect(screen.getByRole('button', { name: 'Employer role' })).toBeInTheDocument();
  });

  it('opens a Pilot agreement template without asking for the type again', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=pilot']}>
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement on');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Pilot / Collaboration');
    expect(screen.getByText(/This agreement is entered into between/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create agreement' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agreements-add-evaluation'));
    expect(screen.getByLabelText('How the pilot will be evaluated')).toBeInTheDocument();
  });

  it('opens Employment as a document template with progressive sections', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=employment']}>
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement on');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Employment');
    expect(screen.getByTestId('agreement-document')).toHaveTextContent('This agreement is entered into between');
    expect(screen.getByTestId('agreement-party-role-employer')).toHaveClass('italic');
    expect(screen.getByTestId('agreement-party-role-employer')).toHaveTextContent(/^the Employer$/);
    expect(screen.getByTestId('agreement-party-role-employee')).toHaveTextContent(/^the Employee$/);
    expect(screen.getByLabelText('Select or enter employer')).toHaveAttribute('data-placeholder', 'Select or enter employer');
    expect(screen.getByLabelText('Select or enter employee')).toHaveAttribute('data-placeholder', 'Select or enter employee');
    expect(screen.getByLabelText('Enter the position')).toHaveAttribute('data-placeholder', 'Enter the position');
    expect(screen.queryByPlaceholderText('Search or enter person or organization')).not.toBeInTheDocument();
    expect(screen.queryByText('Add compensation details')).toBeInTheDocument();
    expect(screen.queryByText('+ Add compensation details')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Compensation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agreements-add-compensation'));
    expect(screen.getByLabelText('Compensation')).toBeInTheDocument();
    expect(screen.getByText(/not legal advice/i)).toBeInTheDocument();
    expect(screen.getByText('Add terms')).toBeInTheDocument();
  });

  it('opens a Sale / Purchase document with known listing facts already filled', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=sale_purchase&from=market_listing&relatedTitle=Lab%20microscope&partyName=Cedar%20River%20University&product=Lab%20microscope&quantity=2&unitPrice=400&currency=USD']}>
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement on');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Sale / Purchase');
    expect(screen.getByTestId('agreement-document')).toHaveTextContent('The Seller agrees to sell, and the Buyer agrees to purchase');
    expect(screen.getByTestId('agreement-token-goods')).toHaveTextContent('Lab microscope');
    expect(screen.getByTestId('agreement-token-quantity')).toHaveTextContent('2');
    expect(screen.getByTestId('agreement-token-currency')).toHaveTextContent('USD');
    expect(screen.queryByLabelText('Payment terms')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agreements-add-payment'));
    expect(screen.getByLabelText('Payment terms')).toBeInTheDocument();
  });

  it('opens a flexible custom agreement for an unsupported type name', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=custom&customType=Distribution%20Agreement']}>
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement on');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Distribution Agreement');
    expect(screen.getByText(/This agreement is entered into between/)).toBeInTheDocument();
    expect(screen.getByTestId('agreements-add-custom-section')).toBeInTheDocument();
  });

  it('prefills Employment from a Job launch', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=employment&from=job&relatedTitle=Baker&position=Baker&workLocation=Bakersfield%2C%20CA&employmentSelfRole=employee']}>
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement on');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Employment');
    expect(screen.getByTestId('agreement-token-position')).toHaveTextContent('Baker');
    expect(screen.getByTestId('agreement-token-workLocation')).toHaveTextContent('Bakersfield, CA');
    expect(screen.getByTestId('agreement-token-employee')).toHaveTextContent('Alex Rivera');
    expect(screen.getAllByText('Baker').length).toBeGreaterThan(0);
  });

  it('places a party reference on the type line instead of numbering the page title', () => {
    const cases: Array<{ type: string; heading: string }> = [
      { type: 'general', heading: 'General' },
      { type: 'partnership', heading: 'Partnership / Collaboration' },
      { type: 'funding', heading: 'Funding / Sponsorship' },
      { type: 'nda', heading: 'Confidentiality / NDA' },
      { type: 'lease', heading: 'Lease' },
    ];
    for (const item of cases) {
      const view = render(
        <MemoryRouter initialEntries={[`/agreements/new?type=${item.type}`]}>
          <AgreementCreate />
        </MemoryRouter>,
      );
      expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement on');
      expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent(item.heading);
      expect(screen.getByTestId('agreement-document').textContent).toMatch(/is entered into between/);
      expect(screen.getByTestId('agreement-document').textContent).toMatch(/\(the /);
      expect(screen.getByTestId('agreement-document').textContent).not.toMatch(/\n\s*and\s*\n/);
      view.unmount();
    }
  });

  it('lets the Service heading switch to Contribution from the hover menu', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    const heading = screen.getByRole('button', { name: 'Agreement type' });
    fireEvent.mouseEnter(heading.parentElement!);
    expect(screen.queryByRole('option', { name: 'Service Provision' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Contribution' }));
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Contribution');
    expect(screen.getByRole('button', { name: 'Organization / Project role' })).toHaveTextContent('Organization / Project');
    expect(screen.getByRole('button', { name: 'Contributor role' })).toHaveTextContent('Contributor');
  });

  it('renames the heading on click instead of opening a Rename row', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Agreement type' }));
    expect(screen.getByTestId('agreement-choice-rename')).toHaveTextContent('Service Provision');
    expect(screen.getByTestId('agreement-choice-rename').className).not.toMatch(/\bitalic\b/);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
  });

  it('lets the first party become Service Provider and switches the other party to Client', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Client role' }).parentElement!);
    expect(screen.getByRole('option', { name: 'Service Provider' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Service Provider' }));
    expect(screen.getByRole('button', { name: 'Service Provider role' })).toHaveTextContent('Service Provider');
    expect(screen.getByRole('button', { name: 'Client role' })).toHaveTextContent('Client');
    expect(screen.getByTestId('agreement-party-role-party_a')).toHaveClass('italic');
    expect(screen.getByTestId('agreement-party-role-party_a')).toHaveTextContent(/^the Service Provider$/);
    fireEvent.click(screen.getByRole('button', { name: 'Service Provider role' }));
    expect(screen.getByTestId('agreement-choice-rename')).toHaveClass('italic');
    expect(screen.getByTestId('agreement-party-reference')).toHaveTextContent('AR');
  });

  it('lets a paragraph be rewritten after clicking the sentence', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('agreement-paragraph-not_employment'));
    const editor = screen.getByTestId('agreement-paragraph-editor-not_employment');
    expect(editor).toHaveAttribute('contenteditable', 'true');
    expect(editor.className).toMatch(/overflow-hidden/);
    expect(editor.className).toMatch(/min-h-\[1\.5em\]/);
    expect(editor).toHaveTextContent(/does not establish employment/);
    editor.innerHTML = 'This covers a custom engagement between the parties.';
    fireEvent.input(editor);
    fireEvent.blur(editor);
    expect(screen.getByTestId('agreement-paragraph-wording-not_employment')).toHaveTextContent('This covers a custom engagement between the parties.');
  });

  it('grows the scope field from a click, keeps one line until typed, and shows formatting tools', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    const scope = screen.getByTestId('agreement-token-purpose');
    expect(scope).toHaveAttribute('contenteditable', 'true');
    expect(scope.className.split(/\s+/)).toContain('inline');
    expect(scope.className.split(/\s+/)).not.toContain('w-full');
    expect(screen.getByTestId('agreement-paragraph-scope').textContent).toMatch(/The service or contribution is:/);
    const emptyParty = screen.getByTestId('agreement-token-party_b');
    expect(emptyParty).toHaveAttribute('data-placeholder', 'Select or enter party');
    expect(emptyParty.className.split(/\s+/)).toContain('text-primary');
    expect(emptyParty.className).toMatch(/before:text-primary/);
    fireEvent.click(emptyParty);
    expect(emptyParty).toHaveFocus();
    emptyParty.textContent = 'J';
    fireEvent.input(emptyParty);
    expect(emptyParty).toHaveTextContent('J');
    fireEvent.click(scope);
    expect(scope).toHaveFocus();
    expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'List' }).parentElement!);
    expect(screen.getByRole('button', { name: 'Bulleted list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Numbered list' })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Align text' }).parentElement!);
    expect(screen.getByRole('button', { name: 'Justify' })).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByRole('button', { name: 'Align text' }).parentElement!);
    fireEvent.click(screen.getByRole('button', { name: 'Align text' }));
    expect(screen.getByRole('button', { name: 'Left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Justify' })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Font' }).parentElement!);
    expect(screen.getByRole('button', { name: 'Georgia' })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Text size' }).parentElement!);
    expect(screen.getByRole('button', { name: '12' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '14' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '16' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '18' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '24' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Small' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Normal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Large' })).not.toBeInTheDocument();
    scope.textContent = 'Garden maintenance for the office.';
    fireEvent.input(scope);
    expect(scope).toHaveTextContent('Garden maintenance for the office.');
    fireEvent.keyDown(scope, { key: 'Enter' });
    expect(scope).toHaveFocus();
  });

  it('opens a Lease document with Car and other lease kinds available', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=lease']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Lease');
    expect(screen.getByRole('button', { name: 'Landlord role' })).toHaveTextContent('Landlord');
    expect(screen.getByRole('button', { name: 'Tenant role' })).toHaveTextContent('Tenant');
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Agreement type' }).parentElement!);
    expect(screen.queryByRole('option', { name: 'Lease' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Car lease' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Residential lease' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Commercial lease' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Vehicle lease' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Equipment lease' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Office lease' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Car lease' }));
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Car lease');
    expect(screen.getByRole('button', { name: 'Lessor role' })).toHaveTextContent('Lessor');
    expect(screen.getByRole('button', { name: 'Lessee role' })).toHaveTextContent('Lessee');
  });

  it('prefills a one-year term and lets the ending condition become until completed', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    const start = localIsoDate();
    const end = addCalendarYears(start, 1);
    expect(screen.getByLabelText('Select start date')).toHaveTextContent(formatAgreementDate(start));
    expect(screen.getByLabelText('Select end date')).toHaveTextContent(formatAgreementDate(end));
    expect(screen.getByTestId('agreement-token-startAt')).toHaveAttribute('data-iso-date', start);
    expect(screen.getByTestId('agreement-token-endAt')).toHaveAttribute('data-iso-date', end);
    expect(screen.getByTestId('agreement-paragraph-term').textContent).toMatch(new RegExp(`from ${formatAgreementDate(start)} until ${formatAgreementDate(end)}`));
    fireEvent.mouseEnter(screen.getByLabelText('Select start date').parentElement!);
    expect(screen.getByTestId('agreement-date-picker')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Until completed' })).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'End of this agreement' }).parentElement!);
    fireEvent.click(screen.getByRole('option', { name: 'until completed' }));
    expect(screen.getByRole('button', { name: 'End of this agreement' })).toHaveTextContent('until completed');
    expect(screen.queryByLabelText('Select end date')).not.toBeInTheDocument();
    expect(screen.getByTestId('agreement-paragraph-term')).toHaveTextContent(/until completed/);
    expect(screen.getByTestId('agreement-paragraph-term').textContent).not.toMatch(/until completed.*Select end date|Select end date.*until completed/);
  });

  it('keeps letters and dashes in the party reference and allows a blank number', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    const number = screen.getByTestId('agreement-party-reference');
    expect(number).toHaveAttribute('contenteditable', 'true');
    expect(number.className.split(/\s+/)).toContain('text-right');
    expect(number).toHaveAttribute('data-placeholder', 'Your reference');
    number.textContent = 'usc-2026-04';
    fireEvent.input(number);
    fireEvent.blur(number);
    expect(number).toHaveTextContent('USC-2026-04');
    number.textContent = '';
    fireEvent.input(number);
    fireEvent.blur(number);
    expect(number).toHaveTextContent('');
    expect(screen.getByRole('button', { name: 'Create agreement' })).toBeEnabled();
  });

  it('keeps Client and Service Provider on a service relationship', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Service Provision');
    expect(screen.getByRole('button', { name: 'Client role' })).toHaveTextContent('Client');
    expect(screen.getByRole('button', { name: 'Service Provider role' })).toHaveTextContent('Service Provider');
    expect(screen.getByTestId('agreement-party-role-party_a')).toHaveClass('italic');
    expect(screen.getByTestId('agreement-party-role-party_a')).toHaveTextContent(/^the Client$/);
    expect(screen.getByTestId('agreement-party-role-party_b')).toHaveTextContent(/^the Service Provider$/);
    expect(screen.getByRole('button', { name: 'Agreement type' }).className).not.toMatch(/\bitalic\b/);
  });

  it('highlights missing required information instead of creating the agreement', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create agreement' }));
    expect(createCollaborationAgreement).not.toHaveBeenCalled();
    const missingParty = screen.getByTestId('agreement-token-party_b');
    expect(missingParty).toHaveAttribute('data-agreement-missing', 'true');
    expect(missingParty).toHaveFocus();
  });

  it('inserts optional terms once and lets them be removed', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('agreements-add-payment'));
    expect(screen.getByLabelText('Payment terms')).toBeInTheDocument();
    expect(screen.queryByTestId('agreements-add-payment')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agreements-remove-payment'));
    expect(screen.queryByLabelText('Payment terms')).not.toBeInTheDocument();
    expect(screen.getByTestId('agreements-add-payment')).toBeInTheDocument();
  });
});
