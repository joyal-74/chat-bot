export const buildMongoQuery = (filters) => {

  const query = {};

  if (filters.type)
    query.type = filters.type;

  if (filters.name)
    query.name = filters.name;

  if (filters.region)
    query.region = filters.region;

  if (filters.status)
    query.status = filters.status;

  if (filters.createdAfter || filters.createdBefore) {

    query.createdAt = {};

    if (filters.createdAfter)
      query.createdAt.$gte = new Date(filters.createdAfter);

    if (filters.createdBefore)
      query.createdAt.$lte = new Date(filters.createdBefore);
  }

  return query;
};