import { Injectable } from '@nestjs/common';

interface EInvoiceData {
  invoiceNumber: string; invoiceDate: Date; dueDate: Date;
  seller: { name: string; address: string; taxId: string };
  buyer: { name: string; address: string; taxId: string };
  lines: { description: string; amountMinor: number; vatRate: number; taxCode: string }[];
  currency: string;
}

function escapeXml(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

@Injectable()
export class EInvoiceService {
  generateZugferdXml(data: EInvoiceData): string {
    const fmt = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');
    const amt = (minor: number) => (minor / 100).toFixed(2);
    const netTotal = data.lines.reduce((s, l) => s + l.amountMinor, 0);
    const vatTotal = data.lines.reduce((s, l) => s + Math.round(l.amountMinor * l.vatRate), 0);
    const grossTotal = netTotal + vatTotal;

    return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument><ram:ID>${data.invoiceNumber}</ram:ID><ram:TypeCode>380</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${fmt(data.invoiceDate)}</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty><ram:Name>${escapeXml(data.seller.name)}</ram:Name><ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${data.seller.taxId}</ram:ID></ram:SpecifiedTaxRegistration></ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>${escapeXml(data.buyer.name)}</ram:Name><ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${data.buyer.taxId}</ram:ID></ram:SpecifiedTaxRegistration></ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${data.currency}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime><udt:DateTimeString format="102">${fmt(data.dueDate)}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${amt(netTotal)}</ram:LineTotalAmount><ram:TaxTotalAmount currencyID="${data.currency}">${amt(vatTotal)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${amt(grossTotal)}</ram:GrandTotalAmount><ram:DuePayableAmount>${amt(grossTotal)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
  }
}
