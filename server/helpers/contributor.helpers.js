import Contributor from "../models/Contributor.js";

export const getContributorWithEmployment = async (contributorId) => {
  try {
    const contributor = await Contributor.findById(contributorId).lean();
    if (!contributor) return null;

    return {
      contributor_id: contributor._id,
      name: contributor.name,
      email: contributor.email,
      bio: contributor.bio,
      profile_image_url: contributor.profile_image_url,
      linkedin_url: contributor.linkedin_url,
      twitter_url: contributor.twitter_url,
      website_url: contributor.website_url,
      employment: contributor.current_employment
        ? {
            company_name: contributor.current_employment.company_name,
            job_position: contributor.current_employment.job_position,
            description: contributor.current_employment.description,
            company_logo_url: contributor.current_employment.company_logo_url,
          }
        : null,
    };
  } catch (error) {
    console.error(`Error fetching contributor ${contributorId}:`, error);
    return null;
  }
};

export const updateContentContributors = async (contributorsData) => {
  const updatedContributors = [];

  for (const contributorData of contributorsData) {
    const contributorDetails = await getContributorWithEmployment(
      contributorData.contributor_id
    );

    if (contributorDetails) {
      updatedContributors.push({
        ...contributorDetails,
        role: contributorData.role || "",
      });
    }
  }

  return updatedContributors;
};
