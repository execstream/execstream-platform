import mongoose from "mongoose";

const partnerCompanySchema = new mongoose.Schema(
  {
    company_name: { type: String },
    partner_company_logo_image_url: { type: String, required: true },
    link: { type: String },
    order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

partnerCompanySchema.index({ is_active: 1, order: 1 });

export default mongoose.model("PartnerCompany", partnerCompanySchema);
