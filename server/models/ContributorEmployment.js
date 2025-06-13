import mongoose from "mongoose";

const contributorEmploymentSchema = new mongoose.Schema(
  {
    contributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contributor",
      required: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    job_title: {
      type: String,
      required: true,
      trim: true,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date, // Optional if currently employed
      validate: {
        validator: function (value) {
          return !value || value >= this.start_date;
        },
        message: "End date must be after start date",
      },
    },
  },
  { timestamps: true }
);

contributorEmploymentSchema.index({
  contributor_id: 1,
  start_date: 1,
  end_date: 1,
});

export default mongoose.model(
  "ContributorEmployment",
  contributorEmploymentSchema
);
